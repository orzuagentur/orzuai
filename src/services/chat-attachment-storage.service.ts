import "server-only";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChatAttachmentUploadResult = {
  path: string;
  sizeBytes: number;
  thumbnailPath?: string;
  thumbWidth?: number;
  thumbHeight?: number;
  /** @deprecated Legacy public URL; prefer signed URLs via getChatAttachmentSignedUrl */
  url: string;
};

export {
  downloadChatAttachmentBuffer,
  getChatAttachmentSignedUrl,
} from "@/services/chat-attachment-signed-url.service";

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
  const { buildThumbnailStoragePath, generateImageThumbnailBuffer } = await import(
    "@/utils/image-thumbnail"
  );

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
