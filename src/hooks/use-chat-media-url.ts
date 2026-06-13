"use client";

import { useEffect, useState } from "react";

import { getChatMediaUrlAction } from "@/features/chats/actions/get-chat-media-url";
import {
  resolveCachedMediaUrl,
  setCachedMediaUrl,
} from "@/lib/client-cache/inbox-messenger-cache";
import type { ChatMediaPayload } from "@/utils/chat-media";
import {
  buildMediaUrlCacheKey,
  isMediaPendingHydration,
  resolveMediaStoragePath,
} from "@/utils/chat-media";

type UseChatMediaUrlOptions = {
  messageId?: string;
  enabled?: boolean;
};

type UseChatMediaUrlResult = {
  url: string | null;
  isLoading: boolean;
  error: boolean;
};

function getCandidateCacheKeys(
  media: ChatMediaPayload,
  messageId?: string,
): string[] {
  const keys: string[] = [];
  const storagePath = resolveMediaStoragePath(media);
  const cacheKey = buildMediaUrlCacheKey(media, messageId);

  if (storagePath) {
    keys.push(storagePath);
  }

  if (cacheKey && !keys.includes(cacheKey)) {
    keys.push(cacheKey);
  }

  return keys;
}

function getInitialMediaUrl(
  media: ChatMediaPayload,
  messageId?: string,
): string | null {
  if (media.url?.startsWith("blob:")) {
    return media.url;
  }

  if (isMediaPendingHydration(media)) {
    return null;
  }

  return resolveCachedMediaUrl(getCandidateCacheKeys(media, messageId));
}

export function useChatMediaUrl(
  media: ChatMediaPayload,
  options: UseChatMediaUrlOptions = {},
): UseChatMediaUrlResult {
  const enabled = options.enabled ?? true;
  const storagePath = resolveMediaStoragePath(media);
  const cacheKeys = getCandidateCacheKeys(media, options.messageId);
  const primaryCacheKey = buildMediaUrlCacheKey(media, options.messageId);

  const [url, setUrl] = useState<string | null>(() =>
    getInitialMediaUrl(media, options.messageId),
  );
  const [isLoading, setIsLoading] = useState(
    () =>
      enabled &&
      (isMediaPendingHydration(media) ||
        !getInitialMediaUrl(media, options.messageId)),
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      if (media.url?.startsWith("blob:")) {
        setUrl(media.url);
        setError(false);
        setIsLoading(false);
        return;
      }

      if (isMediaPendingHydration(media)) {
        setUrl(null);
        setError(false);
        setIsLoading(true);
        return;
      }

      if (!storagePath && !media.url) {
        setUrl(null);
        setIsLoading(false);
        setError(true);
        return;
      }

      const initial = getInitialMediaUrl(media, options.messageId);
      setUrl(initial);
      setError(false);
      setIsLoading(!initial);

      const cached = resolveCachedMediaUrl(cacheKeys);

      if (cached) {
        setUrl(cached);
        setError(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(false);

      const result = await getChatMediaUrlAction({
        path: media.path,
        url: media.url,
      });

      if (cancelled) {
        return;
      }

      if (result.success) {
        for (const cacheKey of cacheKeys) {
          setCachedMediaUrl(cacheKey, result.url);
        }

        if (storagePath && !cacheKeys.includes(storagePath)) {
          setCachedMediaUrl(storagePath, result.url);
        }

        setUrl(result.url);
        setError(false);
      } else {
        setUrl(null);
        setError(true);
      }

      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    cacheKeys.join("|"),
    enabled,
    media.path,
    media.url,
    options.messageId,
    primaryCacheKey,
    storagePath,
  ]);

  return { url, isLoading, error };
}
