"use client";

import { useEffect, useRef } from "react";

import { prefetchChatMediaUrlsAction } from "@/features/chats/actions/prefetch-chat-media-urls";
import { setCachedMediaUrl } from "@/lib/client-cache/inbox-messenger-cache";
import type { ChatMessageData } from "@/types/chat.types";
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
    const { media } = parseMediaMessage(message?.content ?? "");

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
  const visibleKey = visibleIndices.join(",");

  useEffect(() => {
    if (!enabled || messages.length === 0 || visibleIndices.length === 0) {
      return;
    }

    const paths = collectVisibleMediaPaths(messages, visibleIndices);

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
  }, [enabled, messages, visibleIndices, visibleKey]);
}

/** @deprecated Use usePrefetchVisibleConversationMedia with virtual row indices. */
export function usePrefetchConversationMedia(
  messages: ChatMessageData[],
  enabled = true,
): void {
  const indices = messages.map((_, index) => index);

  usePrefetchVisibleConversationMedia(messages, indices, enabled);
}
