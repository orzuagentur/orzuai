"use client";

import { useEffect, useMemo, useRef } from "react";

import { prefetchChatMediaUrlsAction } from "@/features/chats/actions/prefetch-chat-media-urls";
import { persistMediaBlob } from "@/lib/client-cache/chat-media-blob-cache";
import { setCachedMediaUrl } from "@/lib/client-cache/inbox-messenger-cache";
import type { ChatMessageData } from "@/types/chat.types";
import { isOptimisticMessageId } from "@/utils/optimistic-chat-message";
import { parseMediaMessage, resolveMediaStoragePath } from "@/utils/chat-media";

const PREFETCH_THROTTLE_MS = 300;

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

function serializeVisibleRange(visibleIndices: readonly number[]): string {
  if (visibleIndices.length === 0) {
    return "";
  }

  let min = visibleIndices[0]!;
  let max = visibleIndices[0]!;

  for (const index of visibleIndices) {
    min = Math.min(min, index);
    max = Math.max(max, index);
  }

  return `${min}-${max}`;
}

export function usePrefetchVisibleConversationMedia(
  messages: ChatMessageData[],
  visibleIndices: readonly number[],
  enabled = true,
): void {
  const requestIdRef = useRef(0);
  const throttleTimerRef = useRef<number | null>(null);

  const visibleRangeKey = useMemo(
    () => (enabled && messages.length > 0 ? serializeVisibleRange(visibleIndices) : ""),
    [enabled, messages.length, visibleIndices],
  );

  const mediaPathsKey = useMemo(() => {
    if (!visibleRangeKey) {
      return "";
    }

    return collectVisibleMediaPaths(messages, visibleIndices).join("\u0000");
  }, [messages, visibleIndices, visibleRangeKey]);

  useEffect(() => {
    if (!mediaPathsKey) {
      return;
    }

    if (throttleTimerRef.current !== null) {
      window.clearTimeout(throttleTimerRef.current);
    }

    throttleTimerRef.current = window.setTimeout(() => {
      throttleTimerRef.current = null;

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
          void persistMediaBlob(path, url);
        }
      });
    }, PREFETCH_THROTTLE_MS);

    return () => {
      if (throttleTimerRef.current !== null) {
        window.clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [mediaPathsKey]);
}
