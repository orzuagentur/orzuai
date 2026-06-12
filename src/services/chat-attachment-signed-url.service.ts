import "server-only";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCachedSignedMediaUrl,
  storeCachedSignedMediaUrl,
} from "@/services/media-url-cache.service";
import { applyMediaCdnUrl } from "@/utils/media-cdn";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

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
