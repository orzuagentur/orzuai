import "server-only";

import type { ChatMessageData } from "@/types/chat.types";
import type { Database, MessageDeliveryStatus } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export async function enrichChatMessages(
  admin: MessagingDbClient,
  messages: ChatMessageData[],
): Promise<ChatMessageData[]> {
  if (messages.length === 0) {
    return messages;
  }

  const messageIds = messages.map((message) => message.id);
  const outboundUserIds = messages
    .filter(
      (message) =>
        message.senderType === "user" && !message.hiddenForBusiness,
    )
    .map((message) => message.id);

  const deliveryByMessageId = new Map<string, MessageDeliveryStatus>();

  if (outboundUserIds.length > 0) {
    const { data: deliveries } = await admin
      .from("message_deliveries")
      .select("message_id, status")
      .in("message_id", outboundUserIds);

    for (const delivery of deliveries ?? []) {
      deliveryByMessageId.set(delivery.message_id, delivery.status);
    }
  }

  const { data: attachments } = await admin
    .from("message_attachments")
    .select("message_id, status")
    .in("message_id", messageIds);

  const pendingAttachmentIds = new Set(
    (attachments ?? [])
      .filter((attachment) => attachment.status === "pending")
      .map((attachment) => attachment.message_id),
  );

  return messages.map((message) => {
    const deliveryStatus = deliveryByMessageId.get(message.id) ?? null;

    return {
      ...message,
      deliveryStatus,
      attachmentPending: pendingAttachmentIds.has(message.id),
    };
  });
}
