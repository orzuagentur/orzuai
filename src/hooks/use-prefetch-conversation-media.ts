"use client";

import { useEffect, useRef } from "react";

import { prefetchChatMediaUrlsAction } from "@/features/chats/actions/prefetch-chat-media-urls";
import { warmMediaBlobCache } from "@/lib/client-cache/media-browser-cache";
import {
  getCachedMediaUrl,
  setCachedMediaUrl,
} from "@/lib/client-cache/inbox-messenger-cache";
import type { ChatMessageData } from "@/types/chat.types";
import { parseMediaMessage, resolveMediaStoragePath } from "@/utils/chat-media";

function collectUncachedMediaPaths(messages: ChatMessageData[]): string[] {
  const paths = new Set<string>();

  for (const message of messages) {
    const { media } = parseMediaMessage(message.content);

    if (!media) {
      continue;
    }

    const path = resolveMediaStoragePath(media);

    if (path && !getCachedMediaUrl(path)) {
      paths.add(path);
    }

    if (media.thumbPath?.trim() && !getCachedMediaUrl(media.thumbPath.trim())) {
      paths.add(media.thumbPath.trim());
    }
  }

  return [...paths];
}

export function usePrefetchConversationMedia(
  messages: ChatMessageData[],
  enabled = true,
): void {
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || messages.length === 0) {
      return;
    }

    const paths = collectUncachedMediaPaths(messages);

    if (paths.length === 0) {
      return;
    }

    const requestId = ++requestIdRef.current;

    void prefetchChatMediaUrlsAction(paths).then((result) => {
      if (requestId !== requestIdRef.current || !result.success) {
        return;
      }

      for (const [path, url] of Object.entries(result.urls)) {
        setCachedMediaUrl(path, url);
        void warmMediaBlobCache(path, url);
      }
    });
  }, [enabled, messages]);
}
