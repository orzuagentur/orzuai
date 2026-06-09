import "server-only";

import {
  CHAT_ATTACHMENTS_BUCKET,
} from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type ChatAttachmentUploadResult = {
  path: string;
  sizeBytes: number;
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

export async function getChatAttachmentSignedUrl(
  path: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("[chat-attachments] signed URL failed:", error.message);
    return null;
  }

  return data.signedUrl;
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

  return uploadBuffer(path, buffer, options.mimeType);
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
