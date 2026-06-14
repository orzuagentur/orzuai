import "server-only";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateChannelMessageContent } from "@/services/messaging.service";
import { markMessageAttachmentReady } from "@/services/message-attachment.service";
import {
  downloadChatAttachmentBuffer,
} from "@/services/chat-attachment-signed-url.service";
import {
  buildThumbnailStoragePath,
  generateImageThumbnailBuffer,
} from "@/utils/image-thumbnail";
import {
  encodeMediaMessage,
  parseMediaMessage,
  type ChatMediaPayload,
} from "@/utils/chat-media";

export function scheduleOutboundAttachmentThumbnail(input: {
  messageId: string;
  businessId: string;
  storagePath: string;
  mimeType: string;
}): void {
  if (!input.mimeType.startsWith("image/")) {
    return;
  }

  void generateAndAttachChatThumbnail(input).catch((error) => {
    console.error("[chat-attachments] thumbnail generation failed", error);
  });
}

async function generateAndAttachChatThumbnail(input: {
  messageId: string;
  businessId: string;
  storagePath: string;
  mimeType: string;
}): Promise<void> {
  const admin = createAdminClient();
  const sourceBuffer = await downloadChatAttachmentBuffer(input.storagePath);

  if (!sourceBuffer) {
    return;
  }

  const thumbnail = await generateImageThumbnailBuffer(sourceBuffer);

  if (!thumbnail) {
    return;
  }

  const thumbnailPath = buildThumbnailStoragePath(input.storagePath);
  const { error: thumbError } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(thumbnailPath, thumbnail.buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (thumbError) {
    console.error("[chat-attachments] thumbnail upload failed", thumbError.message);
    return;
  }

  const { data: messageRow } = await admin
    .from("messages")
    .select("id, content")
    .eq("id", input.messageId)
    .maybeSingle();

  if (!messageRow?.content) {
    return;
  }

  const { media, text } = parseMediaMessage(messageRow.content);

  if (!media) {
    return;
  }

  const enrichedMedia: ChatMediaPayload = {
    ...media,
    thumbPath: thumbnailPath,
    thumbWidth: thumbnail.width,
    thumbHeight: thumbnail.height,
  };

  await updateChannelMessageContent(admin, {
    messageId: input.messageId,
    content: encodeMediaMessage(enrichedMedia, text),
  });

  await markMessageAttachmentReady(admin, {
    messageId: input.messageId,
    media: enrichedMedia,
  });
}
