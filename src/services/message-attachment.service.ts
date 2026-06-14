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
      last_error: null,
      next_retry_at: null,
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

export async function saveMessageAttachmentHydrationContext(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    providerMediaId?: string;
    context?: Record<string, unknown>;
  },
): Promise<void> {
  const update: Database["public"]["Tables"]["message_attachments"]["Update"] =
    {
      hydration_context: (input.context ?? {}) as Database["public"]["Tables"]["message_attachments"]["Update"]["hydration_context"],
    };

  if (input.providerMediaId) {
    update.provider_media_id = input.providerMediaId;
  }

  const { error } = await admin
    .from("message_attachments")
    .update(update)
    .eq("message_id", input.messageId);

  if (error) {
    console.error(
      "[message-attachment] save hydration context failed",
      error.message,
    );
  }
}

export async function markMessageAttachmentFailed(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    error: string;
    retryCount: number;
    nextRetryAt: string | null;
  },
): Promise<void> {
  const { error } = await admin
    .from("message_attachments")
    .update({
      status: "failed",
      retry_count: input.retryCount,
      last_error: input.error,
      next_retry_at: input.nextRetryAt,
    })
    .eq("message_id", input.messageId);

  if (error) {
    console.error("[message-attachment] mark failed failed", error.message);
  }
}

export async function resetMessageAttachmentForRetry(
  admin: MessagingDbClient,
  messageId: string,
): Promise<boolean> {
  const { data: attachment } = await admin
    .from("message_attachments")
    .select("status, storage_path")
    .eq("message_id", messageId)
    .maybeSingle();

  if (!attachment || attachment.status === "ready" || attachment.storage_path) {
    return false;
  }

  const { data: updated, error } = await admin
    .from("message_attachments")
    .update({
      status: "pending",
      last_error: null,
      next_retry_at: null,
    })
    .eq("message_id", messageId)
    .in("status", ["pending", "failed"])
    .select("message_id")
    .maybeSingle();

  if (error) {
    console.error("[message-attachment] reset for retry failed", error.message);
    return false;
  }

  return Boolean(updated);
}
