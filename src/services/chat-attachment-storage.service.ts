import "server-only";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import { newMediaObjectRef, putMediaObject } from "@/lib/storage/media-storage";
import {
  buildChatAttachmentStoragePath,
  buildInboundAttachmentStoragePath,
} from "@/utils/chat-attachment-path";
import { isR2StorageRef } from "@/utils/storage-ref";

export type ChatAttachmentUploadResult = {
  /** Provider-aware storage ref (R2 `r2::` prefix or legacy Supabase path). */
  path: string;
  sizeBytes: number;
  thumbnailPath?: string;
  thumbWidth?: number;
  thumbHeight?: number;
  /** @deprecated Legacy public URL (Supabase only); prefer signed URLs via getChatAttachmentSignedUrl */
  url?: string;
};

export {
  downloadChatAttachmentBuffer,
  getChatAttachmentSignedUrl,
} from "@/services/chat-attachment-signed-url.service";

function resolveLegacyPublicUrl(ref: string): string | undefined {
  if (isR2StorageRef(ref)) {
    return undefined;
  }

  const admin = createAdminClient();
  const { data } = admin.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(ref);
  return data.publicUrl;
}

async function uploadBuffer(
  ref: string,
  buffer: Buffer,
  mimeType: string,
  options?: { upsert?: boolean },
): Promise<ChatAttachmentUploadResult | null> {
  const upsert = options?.upsert ?? false;
  let ok = await putMediaObject({
    ref,
    body: buffer,
    contentType: mimeType || "application/octet-stream",
    upsert,
  });

  if (!ok && mimeType !== "application/octet-stream") {
    ok = await putMediaObject({
      ref,
      body: buffer,
      contentType: "application/octet-stream",
      upsert,
    });
  }

  if (!ok) {
    console.error("[chat-attachments] upload failed for ref:", ref);
    return null;
  }

  return {
    path: ref,
    sizeBytes: buffer.byteLength,
    url: resolveLegacyPublicUrl(ref),
  };
}

async function uploadImageThumbnail(
  storageRef: string,
  sourceBuffer: Buffer,
): Promise<Pick<ChatAttachmentUploadResult, "thumbnailPath" | "thumbWidth" | "thumbHeight"> | null> {
  const { buildThumbnailStoragePath, generateImageThumbnailBuffer } = await import(
    "@/utils/image-thumbnail"
  );

  const thumbnail = await generateImageThumbnailBuffer(sourceBuffer);

  if (!thumbnail) {
    return null;
  }

  // buildThumbnailStoragePath keeps the provider prefix at the front, so the
  // thumbnail inherits the same provider as its parent object.
  const thumbnailPath = buildThumbnailStoragePath(storageRef);
  const uploaded = await uploadBuffer(
    thumbnailPath,
    thumbnail.buffer,
    "image/jpeg",
  );

  if (!uploaded) {
    return null;
  }

  return {
    thumbnailPath,
    thumbWidth: thumbnail.width,
    thumbHeight: thumbnail.height,
  };
}

export async function uploadChatAttachmentBuffer(
  businessId: string,
  conversationId: string,
  buffer: Buffer,
  options: {
    fileName: string;
    mimeType: string;
    messageId?: string;
  },
): Promise<ChatAttachmentUploadResult | null> {
  const logicalKey = options.messageId
    ? buildInboundAttachmentStoragePath(
        businessId,
        conversationId,
        options.messageId,
        options.fileName,
      )
    : buildChatAttachmentStoragePath(
        businessId,
        conversationId,
        options.fileName,
      );
  const ref = newMediaObjectRef(logicalKey);

  const uploaded = await uploadBuffer(ref, buffer, options.mimeType, {
    upsert: Boolean(options.messageId),
  });

  if (!uploaded) {
    return null;
  }

  if (options.mimeType.startsWith("image/")) {
    const thumbnail = await uploadImageThumbnail(ref, buffer);

    if (thumbnail) {
      return { ...uploaded, ...thumbnail };
    }
  }

  return uploaded;
}

export async function uploadChatAttachmentFile(
  businessId: string,
  conversationId: string,
  file: File,
): Promise<ChatAttachmentUploadResult | null> {
  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadChatAttachmentBuffer(businessId, conversationId, buffer, {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
  });
}
