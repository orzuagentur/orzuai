import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { deliverChannelTextMessage } from "@/services/channels/deliver-text";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import {
  incrementMessagingAnalytics,
  recordMessageDeliveryFailure,
  recordMessageDeliverySuccess,
} from "@/services/messaging.service";

const BATCH_SIZE = 25;

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
      failed += 1;
      continue;
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
      failed += 1;
      continue;
    }

    const result = await deliverChannelTextMessage({
      admin,
      businessId: delivery.business_id,
      channel: delivery.channel,
      recipientId,
      content: message.content,
    });

    if (result.success) {
      await recordMessageDeliverySuccess(admin, {
        messageId: message.id,
        providerMessageId: result.providerMessageId,
      });

      await incrementMessagingAnalytics(admin, delivery.business_id, delivery.channel, {
        totalMessages: 1,
      });

      sent += 1;
      continue;
    }

    const attemptCount = (delivery.attempt_count ?? 0) + 1;
    const maxAttempts = delivery.max_attempts ?? 5;

    await recordMessageDeliveryFailure(admin, {
      messageId: message.id,
      errorMessage: result.error,
    });

    if (attemptCount >= maxAttempts) {
      failed += 1;
    } else {
      retried += 1;
    }
  }

  return {
    processed: pending.length,
    sent,
    retried,
    failed,
  };
}
