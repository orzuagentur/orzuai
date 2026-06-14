"use client";

import { useEffect, useMemo, useRef } from "react";

import { prefetchChatMediaUrlsAction } from "@/features/chats/actions/prefetch-chat-media-urls";
import { setCachedMediaUrl } from "@/lib/client-cache/inbox-messenger-cache";
import type { ChatMessageData } from "@/types/chat.types";
import { isOptimisticMessageId } from "@/utils/optimistic-chat-message";
import { parseMediaMessage, resolveMediaStoragePath } from "@/utils/chat-media";

function collectVisibleMediaPaths(
  messages: ChatMessageData[],
  visibleIndices: readonly number[],
): string[] {
  const thumbPaths: string[] = [];
  const fullPaths: string[] = [];
  const seen = new Set<string>();

  const addPath = (path: string | null | undefined, bucket: string[]) => {
    const normalized = path?.trim();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    bucket.push(normalized);
  };

  for (const index of visibleIndices) {
    const message = messages[index];

    if (!message || message.isPending || isOptimisticMessageId(message.id)) {
      continue;
    }

    const { media } = parseMediaMessage(message.content ?? "");

    if (!media) {
      continue;
    }

    addPath(media.thumbPath, thumbPaths);
    addPath(resolveMediaStoragePath(media), fullPaths);
  }

  return [...thumbPaths, ...fullPaths];
}

export function usePrefetchVisibleConversationMedia(
  messages: ChatMessageData[],
  visibleIndices: readonly number[],
  enabled = true,
): void {
  const requestIdRef = useRef(0);

  const mediaPathsKey = useMemo(() => {
    if (!enabled || messages.length === 0 || visibleIndices.length === 0) {
      return "";
    }

    return collectVisibleMediaPaths(messages, visibleIndices).join("\u0000");
  }, [enabled, messages, visibleIndices]);

  useEffect(() => {
    if (!mediaPathsKey) {
      return;
    }

    const paths = mediaPathsKey.split("\u0000");

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
      }
    });
  }, [mediaPathsKey]);
}

/** @deprecated Use usePrefetchVisibleConversationMedia with virtual row indices. */
export function usePrefetchConversationMedia(
  messages: ChatMessageData[],
  enabled = true,
): void {
  const indices = messages.map((_, index) => index);

  usePrefetchVisibleConversationMedia(messages, indices, enabled);
}
