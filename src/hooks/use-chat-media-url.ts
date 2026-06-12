"use client";

import { useEffect, useState } from "react";

import { getChatMediaUrlAction } from "@/features/chats/actions/get-chat-media-url";
import {
  getCachedMediaUrl,
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
};

type UseChatMediaUrlResult = {
  url: string | null;
  isLoading: boolean;
  error: boolean;
};

function getInitialMediaUrl(
  cacheKey: string | undefined,
  media: ChatMediaPayload,
): string | null {
  if (media.url?.startsWith("blob:")) {
    return media.url;
  }

  if (isMediaPendingHydration(media)) {
    return null;
  }

  if (!cacheKey) {
    return null;
  }

  return getCachedMediaUrl(cacheKey);
}

export function useChatMediaUrl(
  media: ChatMediaPayload,
  options: UseChatMediaUrlOptions = {},
): UseChatMediaUrlResult {
  const storagePath = resolveMediaStoragePath(media);
  const cacheKey = buildMediaUrlCacheKey(media, options.messageId);

  const [url, setUrl] = useState<string | null>(() =>
    getInitialMediaUrl(cacheKey, media),
  );
  const [isLoading, setIsLoading] = useState(
    () =>
      isMediaPendingHydration(media) ||
      !getInitialMediaUrl(cacheKey, media),
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

      const initial = getInitialMediaUrl(cacheKey, media);
      setUrl(initial);
      setError(false);
      setIsLoading(!initial);

      const cached = cacheKey ? getCachedMediaUrl(cacheKey) : null;

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
        if (cacheKey) {
          setCachedMediaUrl(cacheKey, result.url);
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
  }, [cacheKey, media.path, media.url, options.messageId, storagePath]);

  return { url, isLoading, error };
}
