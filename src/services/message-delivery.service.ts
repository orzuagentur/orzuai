import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { deliverChannelMediaMessage } from "@/services/channels/deliver-media";
import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import { downloadChatAttachmentBuffer } from "@/services/chat-attachment-signed-url.service";
import {
  incrementMessagingAnalytics,
  recordMessageDeliveryFailure,
  recordMessageDeliverySuccess,
} from "@/services/messaging.service";
import { parseMediaMessage } from "@/utils/chat-media";

const BATCH_SIZE = 25;

type DeliveryRow = {
  id: string;
  message_id: string;
  business_id: string;
  channel: import("@/types/database.types").MessagingChannel;
  attempt_count: number | null;
  max_attempts: number | null;
};

type DeliveryProcessResult = "sent" | "retried" | "failed" | "skipped";

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
      .select("storage_path, mime_type, file_name, kind")
      .eq("message_id", message.id)
      .maybeSingle();

    const storagePath = attachment?.storage_path ?? media.path;
    const buffer = await downloadChatAttachmentBuffer(storagePath);

    if (!buffer) {
      await recordMessageDeliveryFailure(admin, {
        messageId: message.id,
        errorMessage: "Media file unavailable.",
      });
      return "failed";
    }

    result = await deliverChannelMediaMessage({
      admin,
      businessId: delivery.business_id,
      channel: delivery.channel,
      recipientId,
      content: message.content,
      buffer,
      fileName: attachment?.file_name ?? media.fileName,
      mimeType: attachment?.mime_type ?? media.mimeType,
      mediaKind: attachment?.kind ?? media.kind,
      storagePath,
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
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: delivery } = await admin
    .from("message_deliveries")
    .select("id, message_id, business_id, channel, attempt_count, max_attempts")
    .eq("message_id", messageId)
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .maybeSingle();

  if (!delivery) {
    return;
  }

  await processDeliveryRow(admin, delivery, now);
}

export async function processPendingMessageDeliveries(): Promise<{
  processed: number;
  sent: number;
  retried: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await admin
    .from("message_deliveries")
    .select("id, message_id, business_id, channel, attempt_count, max_attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!pending?.length) {
    return { processed: 0, sent: 0, retried: 0, failed: 0 };
  }

  let sent = 0;
  let retried = 0;
  let failed = 0;

  for (const delivery of pending) {
    const outcome = await processDeliveryRow(admin, delivery, now);

    if (outcome === "sent") {
      sent += 1;
    } else if (outcome === "retried") {
      retried += 1;
    } else if (outcome === "failed") {
      failed += 1;
    }
  }

  return {
    processed: pending.length,
    sent,
    retried,
    failed,
  };
}
