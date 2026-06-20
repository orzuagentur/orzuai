import { setCachedMediaUrl } from "@/lib/client-cache/inbox-messenger-cache";
import { persistMediaBlobFromKeys } from "@/lib/client-cache/chat-media-blob-cache";
import type { ChatMessageData } from "@/types/chat.types";
import {
  buildMediaUrlCacheKey,
  parseMediaMessage,
  resolveMediaStoragePath,
} from "@/utils/chat-media";

export function cacheChatMessageMediaUrl(
  message: ChatMessageData,
  signedUrl: string,
): void {
  const { media } = parseMediaMessage(message.content);

  if (!media) {
    return;
  }

  const path = resolveMediaStoragePath(media);

  if (path) {
    setCachedMediaUrl(path, signedUrl);
  }

  const cacheKey = buildMediaUrlCacheKey(media, message.id);

  if (cacheKey) {
    setCachedMediaUrl(cacheKey, signedUrl);
  }

  void persistMediaBlobFromKeys(
    [path, cacheKey].filter((value): value is string => Boolean(value)),
    signedUrl,
    media.mimeType,
  );
}
