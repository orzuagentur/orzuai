import "server-only";

import {
  CHAT_ATTACHMENTS_BUCKET,
} from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCachedSignedMediaUrl,
  storeCachedSignedMediaUrl,
} from "@/services/media-url-cache.service";
import {
  buildThumbnailStoragePath,
  generateImageThumbnailBuffer,
} from "@/utils/image-thumbnail";
import { applyMediaCdnUrl } from "@/utils/media-cdn";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type ChatAttachmentUploadResult = {
  path: string;
  sizeBytes: number;
  thumbnailPath?: string;
  thumbWidth?: number;
  thumbHeight?: number;
  /** @deprecated Legacy public URL; prefer signed URLs via getChatAttachmentSignedUrl */
  url: string;
};

async function uploadBuffer(
  path: string,
  buffer: Buffer,
  mimeType: string,
): Promise<ChatAttachmentUploadResult | null> {
  const admin = createAdminClient();

  const attempt = async (contentType: string) => {
    const { error } = await admin.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    return error;
  };

  let error = await attempt(mimeType || "application/octet-stream");

  if (error && mimeType !== "application/octet-stream") {
    error = await attempt("application/octet-stream");
  }

  if (error) {
    console.error("[chat-attachments] upload failed:", error.message);
    return null;
  }

  const { data } = admin.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(path);

  return {
    path,
    sizeBytes: buffer.byteLength,
    url: data.publicUrl,
  };
}

async function uploadImageThumbnail(
  storagePath: string,
  sourceBuffer: Buffer,
): Promise<Pick<ChatAttachmentUploadResult, "thumbnailPath" | "thumbWidth" | "thumbHeight"> | null> {
  const thumbnail = await generateImageThumbnailBuffer(sourceBuffer);

  if (!thumbnail) {
    return null;
  }

  const thumbnailPath = buildThumbnailStoragePath(storagePath);
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

export async function getChatAttachmentSignedUrl(
  path: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const cached = await getCachedSignedMediaUrl(path);

  if (cached) {
    return cached;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("[chat-attachments] signed URL failed:", error.message);
    return null;
  }

  const signedUrl = applyMediaCdnUrl(data.signedUrl);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  void storeCachedSignedMediaUrl(path, signedUrl, expiresAt);

  return signedUrl;
}

export async function downloadChatAttachmentBuffer(
  path: string,
): Promise<Buffer | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .download(path);

  if (error || !data) {
    console.error("[chat-attachments] download failed:", error?.message);
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function uploadChatAttachmentBuffer(
  businessId: string,
  conversationId: string,
  buffer: Buffer,
  options: {
    fileName: string;
    mimeType: string;
  },
): Promise<ChatAttachmentUploadResult | null> {
  const extension = options.fileName.includes(".")
    ? options.fileName.slice(options.fileName.lastIndexOf("."))
    : "";
  const path = `${businessId}/${conversationId}/${Date.now()}-${crypto.randomUUID()}${extension}`;

  const uploaded = await uploadBuffer(path, buffer, options.mimeType);

  if (!uploaded) {
    return null;
  }

  if (options.mimeType.startsWith("image/")) {
    const thumbnail = await uploadImageThumbnail(path, buffer);

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
