import "server-only";

import type { Database, MessageAttachmentKind } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseMediaMessage,
  type ChatMediaKind,
  type ChatMediaPayload,
} from "@/utils/chat-media";

type MessagingDbClient = SupabaseClient<Database>;

function toAttachmentKind(kind: ChatMediaKind): MessageAttachmentKind {
  return kind;
}

function attachmentThumbnailFields(media: ChatMediaPayload) {
  return {
    thumbnail_path: media.thumbPath ?? null,
    thumb_width: media.thumbWidth ?? null,
    thumb_height: media.thumbHeight ?? null,
  };
}

export async function createPendingMessageAttachment(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    businessId: string;
    content: string;
    providerMediaId?: string | null;
  },
): Promise<void> {
  const { media } = parseMediaMessage(input.content);

  if (!media) {
    return;
  }

  const { error } = await admin.from("message_attachments").upsert(
    {
      message_id: input.messageId,
      business_id: input.businessId,
      kind: toAttachmentKind(media.kind),
      mime_type: media.mimeType || "application/octet-stream",
      file_name: media.fileName || "attachment",
      storage_path: media.path ?? null,
      size_bytes: media.sizeBytes ?? null,
      duration_sec: media.durationSec ?? null,
      provider_media_id: input.providerMediaId ?? null,
      status: media.path ? "ready" : "pending",
      ...attachmentThumbnailFields(media),
    },
    { onConflict: "message_id" },
  );

  if (error) {
    console.error("[message-attachment] create pending failed", error.message);
  }
}

export async function markMessageAttachmentReady(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    media: ChatMediaPayload;
  },
): Promise<void> {
  const { error } = await admin
    .from("message_attachments")
    .update({
      kind: toAttachmentKind(input.media.kind),
      mime_type: input.media.mimeType || "application/octet-stream",
      file_name: input.media.fileName || "attachment",
      storage_path: input.media.path ?? null,
      size_bytes: input.media.sizeBytes ?? null,
      duration_sec: input.media.durationSec ?? null,
      status: "ready",
      ...attachmentThumbnailFields(input.media),
    })
    .eq("message_id", input.messageId);

  if (error) {
    console.error("[message-attachment] mark ready failed", error.message);
  }
}

export async function createReadyMessageAttachment(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    businessId: string;
    media: ChatMediaPayload;
  },
): Promise<void> {
  const { error } = await admin.from("message_attachments").upsert(
    {
      message_id: input.messageId,
      business_id: input.businessId,
      kind: toAttachmentKind(input.media.kind),
      mime_type: input.media.mimeType || "application/octet-stream",
      file_name: input.media.fileName || "attachment",
      storage_path: input.media.path ?? null,
      size_bytes: input.media.sizeBytes ?? null,
      duration_sec: input.media.durationSec ?? null,
      status: "ready",
      ...attachmentThumbnailFields(input.media),
    },
    { onConflict: "message_id" },
  );

  if (error) {
    console.error("[message-attachment] create ready failed", error.message);
  }
}
