import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimMessageDeliveryJob,
  claimMessageDeliveryJobs,
} from "@/lib/queue/claim-jobs";
import { dispatchMessageDeliveryQStashWorker } from "@/lib/queue/qstash-message-delivery-worker";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { deliverChannelMediaMessage } from "@/services/channels/deliver-media";
import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import { resolveAttachmentProviderMediaUrl } from "@/services/provider-media-url.service";
import { advanceMessageDeliveryStatus } from "@/services/message-delivery-status.service";
import {
  incrementMessagingAnalytics,
  recordMessageDeliveryFailure,
  recordMessageDeliverySuccess,
} from "@/services/messaging.service";
import { parseMediaMessage } from "@/utils/chat-media";

const BATCH_SIZE = 25;
const STALE_PROCESSING_MS = 5 * 60 * 1000;
const MAX_DRAIN_BATCHES = 20;
const DELIVERY_RETRY_BASE_SECONDS = 30;

let deliveryDrainPromise: Promise<DeliveryDrainResult> | null = null;

type DeliveryRow = {
  id: string;
  message_id: string;
  business_id: string;
  channel: import("@/types/database.types").MessagingChannel;
  attempt_count: number | null;
  max_attempts: number | null;
};

type DeliveryProcessResult = "sent" | "retried" | "failed" | "skipped";

export type DeliveryDrainResult = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  recoveredStale: number;
  batches: number;
  durationMs: number;
};

function getDeliveryRetryDelaySeconds(attemptCount: number): number {
  return DELIVERY_RETRY_BASE_SECONDS * 2 ** Math.max(0, attemptCount - 1);
}

function computeDeliveryRetryAt(attemptCount: number): string {
  return new Date(
    Date.now() + getDeliveryRetryDelaySeconds(attemptCount) * 1000,
  ).toISOString();
}

export async function recoverStaleMessageDeliveries(): Promise<number> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const now = new Date().toISOString();

  const { data: staleRows } = await admin
    .from("message_deliveries")
    .select("id, message_id, attempt_count, max_attempts")
    .eq("status", "processing")
    .lt("updated_at", staleBefore);

  if (!staleRows?.length) {
    return 0;
  }

  let recovered = 0;

  for (const row of staleRows) {
    const attemptCount = (row.attempt_count ?? 0) + 1;
    const maxAttempts = row.max_attempts ?? 5;
    const exhausted = attemptCount >= maxAttempts;

    const { error } = await admin
      .from("message_deliveries")
      .update({
        status: exhausted ? "failed" : "pending",
        attempt_count: attemptCount,
        next_attempt_at: exhausted ? now : computeDeliveryRetryAt(attemptCount),
        last_error: exhausted
          ? "Delivery timed out while processing."
          : "Recovered stale processing delivery.",
        failed_at: exhausted ? now : null,
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("status", "processing");

    if (!error && !exhausted) {
      recovered += 1;
    }
  }

  return recovered;
}

async function processDeliveryRow(
  admin: ReturnType<typeof createAdminClient>,
  delivery: DeliveryRow,
  now: string,
): Promise<DeliveryProcessResult> {
  const failDelivery = async (
    messageId: string,
    errorMessage: string,
  ): Promise<DeliveryProcessResult> => {
    await recordMessageDeliveryFailure(admin, {
      messageId,
      errorMessage,
    });

    const attemptCount = (delivery.attempt_count ?? 0) + 1;
    const maxAttempts = delivery.max_attempts ?? 5;

    if (attemptCount < maxAttempts) {
      scheduleMessageDeliveryRetry(attemptCount);
      return "retried";
    }

    return "failed";
  };

  try {
    const { data: existingDelivery } = await admin
      .from("message_deliveries")
      .select("status, sent_at, provider_message_id")
      .eq("id", delivery.id)
      .maybeSingle();

    if (
      existingDelivery?.status === "sent" ||
      existingDelivery?.sent_at ||
      (existingDelivery?.provider_message_id &&
        existingDelivery.provider_message_id.startsWith("outlook:"))
    ) {
      if (existingDelivery.status !== "sent") {
        await recordMessageDeliverySuccess(admin, {
          messageId: delivery.message_id,
          providerMessageId: existingDelivery.provider_message_id,
        });
      }
      return "skipped";
    }

    const { data: message } = await admin
      .from("messages")
      .select(
        "id, conversation_id, channel, content, email_subject, sender_type, hidden_for_business",
      )
      .eq("id", delivery.message_id)
      .maybeSingle();

    if (!message || message.hidden_for_business || message.sender_type !== "user") {
      await admin
        .from("message_deliveries")
        .update({
          status: "failed",
          failed_at: now,
          last_error: "Message unavailable.",
        })
        .eq("id", delivery.id);
      return "failed";
    }

    const recipientId = await resolveChannelRecipient(admin, {
      businessId: delivery.business_id,
      conversationId: message.conversation_id,
      channel: delivery.channel,
    });

    if (!recipientId) {
      return failDelivery(message.id, "Recipient unavailable.");
    }

    const { media } = parseMediaMessage(message.content);
    let result: Awaited<ReturnType<typeof deliverChannelTextMessage>>;

    if (media?.path) {
      const { data: attachment } = await admin
        .from("message_attachments")
        .select(
          "storage_path, mime_type, file_name, kind, provider_media_url, provider_media_url_expires_at",
        )
        .eq("message_id", message.id)
        .maybeSingle();

      const storagePath = attachment?.storage_path ?? media.path;
      const mediaUrl = await resolveAttachmentProviderMediaUrl(admin, {
        messageId: message.id,
        storagePath,
        providerMediaUrl: attachment?.provider_media_url ?? null,
        providerMediaUrlExpiresAt:
          attachment?.provider_media_url_expires_at ?? null,
      });

      if (!mediaUrl) {
        return failDelivery(message.id, "Media URL unavailable.");
      }

      result = await deliverChannelMediaMessage({
        admin,
        businessId: delivery.business_id,
        channel: delivery.channel,
        recipientId,
        content: message.content,
        mediaUrl,
        fileName: attachment?.file_name ?? media.fileName,
        mimeType: attachment?.mime_type ?? media.mimeType,
        mediaKind: attachment?.kind ?? media.kind,
      });
    } else {
      result = await deliverChannelTextMessage({
        admin,
        businessId: delivery.business_id,
        channel: delivery.channel,
        recipientId,
        content: message.content,
        emailSubject: message.email_subject ?? undefined,
        idempotencyKey: message.id,
      });
    }

    if (result.success) {
      await recordMessageDeliverySuccess(admin, {
        messageId: message.id,
        providerMessageId: result.providerMessageId,
      });

      if (delivery.channel === "telegram") {
        await advanceMessageDeliveryStatus(admin, {
          messageId: message.id,
          status: "delivered",
        });
      }

      await incrementMessagingAnalytics(
        admin,
        delivery.business_id,
        delivery.channel,
        {
          totalMessages: 1,
        },
      );

      return "sent";
    }

    return await failDelivery(message.id, result.error);
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "Delivery crashed unexpectedly.";
    console.error("[message-delivery] process crashed", {
      deliveryId: delivery.id,
      messageId: delivery.message_id,
      channel: delivery.channel,
      error: messageText,
    });
    return await failDelivery(delivery.message_id, messageText);
  }
}

function scheduleInProcessDeliveryDrain(): void {
  if (deliveryDrainPromise) {
    return;
  }

  deliveryDrainPromise = drainPendingMessageDeliveries()
    .catch((error) => {
      console.error("[message-delivery] in-process drain failed", error);
      return {
        processed: 0,
        sent: 0,
        retried: 0,
        failed: 0,
        recoveredStale: 0,
        batches: 0,
        durationMs: 0,
      };
    })
    .finally(() => {
      deliveryDrainPromise = null;
    });
}

export function dispatchMessageDeliveryWorker(
  source: "enqueue" | "retry" = "enqueue",
  delaySeconds = 0,
): void {
  if (delaySeconds <= 0) {
    scheduleInProcessDeliveryDrain();
  }

  void dispatchMessageDeliveryQStashWorker({ source, delaySeconds });
}

function scheduleMessageDeliveryRetry(attemptCount: number): void {
  dispatchMessageDeliveryWorker(
    "retry",
    getDeliveryRetryDelaySeconds(attemptCount),
  );
}

export async function dispatchMessageDelivery(messageId: string): Promise<void> {
  await recoverStaleMessageDeliveries();

  const claimed = await claimMessageDeliveryJob(messageId);

  if (claimed) {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    await processDeliveryRow(admin, claimed, now);
    return;
  }

  dispatchMessageDeliveryWorker("enqueue");
}

/** Delivers one outbound message inline (waits for provider API when claim succeeds). */
export async function deliverOutboundMessageNow(
  messageId: string,
): Promise<void> {
  await dispatchMessageDelivery(messageId);
}

/** Returns immediately; delivery continues in-process or via QStash worker. */
export function scheduleOutboundMessageDelivery(messageId: string): void {
  void dispatchMessageDelivery(messageId).catch((error) => {
    console.error("[message-delivery] outbound dispatch failed", error);
  });
}

async function processPendingMessageDeliveriesBatch(): Promise<{
  processed: number;
  sent: number;
  retried: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const claimed = await claimMessageDeliveryJobs(BATCH_SIZE);

  if (claimed.length === 0) {
    return { processed: 0, sent: 0, retried: 0, failed: 0 };
  }

  const outcomes = await runWithConcurrency(
    claimed,
    getWorkerConcurrency(),
    (delivery) => processDeliveryRow(admin, delivery, now),
  );

  return {
    processed: claimed.length,
    sent: outcomes.filter((outcome) => outcome === "sent").length,
    retried: outcomes.filter((outcome) => outcome === "retried").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
  };
}

export async function processPendingMessageDeliveries(): Promise<{
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  recoveredStale: number;
}> {
  const result = await drainPendingMessageDeliveries();
  return {
    processed: result.processed,
    sent: result.sent,
    retried: result.retried,
    failed: result.failed,
    recoveredStale: result.recoveredStale,
  };
}

export async function drainPendingMessageDeliveries(): Promise<DeliveryDrainResult> {
  const startedAt = Date.now();
  const recoveredStale = await recoverStaleMessageDeliveries();

  const totals: DeliveryDrainResult = {
    processed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    batches: 0,
    recoveredStale,
    durationMs: 0,
  };

  let batch = await processPendingMessageDeliveriesBatch();

  while (batch.processed > 0 && totals.batches < MAX_DRAIN_BATCHES) {
    totals.batches += 1;
    totals.processed += batch.processed;
    totals.sent += batch.sent;
    totals.retried += batch.retried;
    totals.failed += batch.failed;

    if (batch.processed < BATCH_SIZE) {
      break;
    }

    batch = await processPendingMessageDeliveriesBatch();
  }

  totals.durationMs = Date.now() - startedAt;

  if (totals.processed > 0) {
    console.info("[message-delivery] drain complete", totals);
  }

  return totals;
}
