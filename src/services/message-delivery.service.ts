import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  claimMessageDeliveryJob,
  claimMessageDeliveryJobs,
} from "@/lib/queue/claim-jobs";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { deliverChannelMediaMessage } from "@/services/channels/deliver-media";
import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import { resolveAttachmentProviderMediaUrl } from "@/services/provider-media-url.service";
import {
  incrementMessagingAnalytics,
  publishMessageDeliveryStatus,
  recordMessageDeliveryFailure,
  recordMessageDeliverySuccess,
} from "@/services/messaging.service";
import { parseMediaMessage } from "@/utils/chat-media";

const BATCH_SIZE = 25;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

type DeliveryRow = {
  id: string;
  message_id: string;
  business_id: string;
  channel: import("@/types/database.types").MessagingChannel;
  attempt_count: number | null;
  max_attempts: number | null;
};

type DeliveryProcessResult = "sent" | "retried" | "failed" | "skipped";

export async function recoverStaleMessageDeliveries(): Promise<number> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data } = await admin
    .from("message_deliveries")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("id");

  return data?.length ?? 0;
}

async function processDeliveryRow(
  admin: ReturnType<typeof createAdminClient>,
  delivery: DeliveryRow,
  now: string,
): Promise<DeliveryProcessResult> {
  const { data: message } = await admin
    .from("messages")
    .select("id, conversation_id, channel, content, sender_type, hidden_for_business")
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
    await publishMessageDeliveryStatus(admin, {
      messageId: delivery.message_id,
      status: "failed",
    });
    return "failed";
  }

  const recipientId = await resolveChannelRecipient(admin, {
    businessId: delivery.business_id,
    conversationId: message.conversation_id,
    channel: delivery.channel,
  });

  if (!recipientId) {
    await recordMessageDeliveryFailure(admin, {
      messageId: message.id,
      errorMessage: "Recipient unavailable.",
    });
    return "failed";
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
      await recordMessageDeliveryFailure(admin, {
        messageId: message.id,
        errorMessage: "Media URL unavailable.",
      });
      return "failed";
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
    });
  }

  if (result.success) {
    await recordMessageDeliverySuccess(admin, {
      messageId: message.id,
      providerMessageId: result.providerMessageId,
    });

    await incrementMessagingAnalytics(admin, delivery.business_id, delivery.channel, {
      totalMessages: 1,
    });

    return "sent";
  }

  const attemptCount = (delivery.attempt_count ?? 0) + 1;
  const maxAttempts = delivery.max_attempts ?? 5;

  await recordMessageDeliveryFailure(admin, {
    messageId: message.id,
    errorMessage: result.error,
  });

  return attemptCount >= maxAttempts ? "failed" : "retried";
}

export async function dispatchMessageDelivery(messageId: string): Promise<void> {
  await recoverStaleMessageDeliveries();

  const claimed = await claimMessageDeliveryJob(messageId);

  if (!claimed) {
    return;
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await processDeliveryRow(admin, claimed, now);
}

export async function processPendingMessageDeliveries(): Promise<{
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  recoveredStale: number;
}> {
  const recoveredStale = await recoverStaleMessageDeliveries();
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const claimed = await claimMessageDeliveryJobs(BATCH_SIZE);

  if (claimed.length === 0) {
    return {
      processed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      recoveredStale,
    };
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
    recoveredStale,
  };
}
