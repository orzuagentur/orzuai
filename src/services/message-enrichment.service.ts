import "server-only";

import type { ChatMessageData } from "@/types/chat.types";
import type { Database, MessageDeliveryStatus } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  encodeMediaMessage,
  parseMediaMessage,
} from "@/utils/chat-media";

type MessagingDbClient = SupabaseClient<Database>;

function enrichContentWithAttachment(
  content: string,
  attachment: {
    thumbnail_path: string | null;
    thumb_width: number | null;
    thumb_height: number | null;
  },
): string {
  const { media, text } = parseMediaMessage(content);

  if (!media || !attachment.thumbnail_path) {
    return content;
  }

  return encodeMediaMessage(
    {
      ...media,
      thumbPath: attachment.thumbnail_path,
      thumbWidth: attachment.thumb_width ?? undefined,
      thumbHeight: attachment.thumb_height ?? undefined,
    },
    text,
  );
}

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
    .select(
      "message_id, status, thumbnail_path, thumb_width, thumb_height",
    )
    .in("message_id", messageIds);

  const attachmentByMessageId = new Map(
    (attachments ?? []).map((attachment) => [attachment.message_id, attachment]),
  );

  const pendingAttachmentIds = new Set(
    (attachments ?? [])
      .filter((attachment) => attachment.status === "pending")
      .map((attachment) => attachment.message_id),
  );

  return messages.map((message) => {
    const deliveryStatus = deliveryByMessageId.get(message.id) ?? null;
    const attachment = attachmentByMessageId.get(message.id);

    return {
      ...message,
      content: attachment
        ? enrichContentWithAttachment(message.content, attachment)
        : message.content,
      deliveryStatus,
      attachmentPending: pendingAttachmentIds.has(message.id),
    };
  });
}
