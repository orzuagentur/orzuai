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

      const cachedSignedUrl = resolveCachedMediaUrl(cacheKeys);

      if (cachedSignedUrl) {
        setUrl(cachedSignedUrl);
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

      if (!result.success) {
        setUrl(null);
        setError(true);
        setIsLoading(false);
        return;
      }

      for (const cacheKey of cacheKeys) {
        setCachedMediaUrl(cacheKey, result.url);
      }

      if (storagePath && !cacheKeys.includes(storagePath)) {
        setCachedMediaUrl(storagePath, result.url);
      }

      setUrl(result.url);
      setError(false);
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
    storagePath,
  ]);

  return { url, isLoading, error };
}

export function useChatImageMediaUrls(
  media: ChatMediaPayload,
  options: UseChatMediaUrlOptions & { isHydrating?: boolean } = {},
): {
  previewUrl: string | null;
  fullUrl: string | null;
  isPreviewLoading: boolean;
  isFullLoading: boolean;
  previewError: boolean;
  fullError: boolean;
} {
  const enabled = (options.enabled ?? true) && !options.isHydrating;
  const hasThumb = Boolean(media.thumbPath && media.kind === "image");
  const previewMedia = hasThumb ? { ...media, path: media.thumbPath! } : media;

  const {
    url: previewUrl,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useChatMediaUrl(previewMedia, {
    messageId: options.messageId,
    enabled: enabled && hasThumb,
  });

  const [loadFull, setLoadFull] = useState(!hasThumb);

  useEffect(() => {
    if (hasThumb && previewUrl && !loadFull) {
      setLoadFull(true);
    }
  }, [hasThumb, loadFull, previewUrl]);

  const {
    url: fullUrl,
    isLoading: isFullLoading,
    error: fullError,
  } = useChatMediaUrl(media, {
    messageId: options.messageId,
    enabled: enabled && loadFull,
  });

  if (!hasThumb) {
    return {
      previewUrl: fullUrl,
      fullUrl,
      isPreviewLoading: isFullLoading,
      isFullLoading,
      previewError: fullError,
      fullError,
    };
  }

  return {
    previewUrl,
    fullUrl,
    isPreviewLoading,
    isFullLoading,
    previewError,
    fullError,
  };
}
