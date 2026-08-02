import "server-only";

import { downloadMediaObject, getMediaSignedUrl } from "@/lib/storage/media-storage";
import {
  getCachedSignedMediaUrl,
  storeCachedSignedMediaUrl,
} from "@/services/media-url-cache.service";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getChatAttachmentSignedUrl(
  path: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const cached = await getCachedSignedMediaUrl(path);

  if (cached) {
    return cached;
  }

  const signedUrl = await getMediaSignedUrl(path, expiresIn);

  if (!signedUrl) {
    return null;
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  void storeCachedSignedMediaUrl(path, signedUrl, expiresAt);

  return signedUrl;
}

export async function downloadChatAttachmentBuffer(
  path: string,
): Promise<Buffer | null> {
  return downloadMediaObject(path);
}
