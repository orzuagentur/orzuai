"use client";

import { useEffect, useRef, useState } from "react";

import { getChatMediaUrlAction } from "@/features/chats/actions/get-chat-media-url";
import {
  getPersistedMediaObjectUrl,
  persistMediaBlobFromKeys,
} from "@/lib/client-cache/chat-media-blob-cache";
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

async function resolvePersistedMediaUrl(
  cacheKeys: string[],
): Promise<string | null> {
  for (const key of cacheKeys) {
    const objectUrl = await getPersistedMediaObjectUrl(key);

    if (objectUrl) {
      return objectUrl;
    }
  }

  return null;
}

function scheduleMediaBlobPersistence(
  cacheKeys: string[],
  sourceUrl: string,
  mimeType?: string,
): void {
  void persistMediaBlobFromKeys(cacheKeys, sourceUrl, mimeType);
}

export function useChatMediaUrl(
  media: ChatMediaPayload,
  options: UseChatMediaUrlOptions = {},
): UseChatMediaUrlResult {
  const enabled = options.enabled ?? true;
  const storagePath = resolveMediaStoragePath(media);
  const cacheKeys = getCandidateCacheKeys(media, options.messageId);
  const managedBlobUrlRef = useRef<string | null>(null);

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
    return () => {
      if (managedBlobUrlRef.current) {
        URL.revokeObjectURL(managedBlobUrlRef.current);
        managedBlobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    function applyUrl(nextUrl: string | null, fromManagedBlob = false) {
      if (cancelled) {
        if (fromManagedBlob && nextUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(nextUrl);
        }
        return;
      }

      if (fromManagedBlob && nextUrl?.startsWith("blob:")) {
        if (
          managedBlobUrlRef.current &&
          managedBlobUrlRef.current !== nextUrl
        ) {
          URL.revokeObjectURL(managedBlobUrlRef.current);
        }

        managedBlobUrlRef.current = nextUrl;
      } else if (managedBlobUrlRef.current) {
        URL.revokeObjectURL(managedBlobUrlRef.current);
        managedBlobUrlRef.current = null;
      }

      setUrl(nextUrl);
    }

    async function load() {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      if (media.url?.startsWith("blob:")) {
        applyUrl(media.url);
        setError(false);
        setIsLoading(false);
        return;
      }

      if (isMediaPendingHydration(media)) {
        applyUrl(null);
        setError(false);
        setIsLoading(true);
        return;
      }

      if (!storagePath && !media.url) {
        applyUrl(null);
        setIsLoading(false);
        setError(true);
        return;
      }

      const cachedSignedUrl = resolveCachedMediaUrl(cacheKeys);

      if (cachedSignedUrl) {
        applyUrl(cachedSignedUrl);
        setError(false);
        setIsLoading(false);
        scheduleMediaBlobPersistence(cacheKeys, cachedSignedUrl, media.mimeType);
        return;
      }

      const persistedUrl = await resolvePersistedMediaUrl(cacheKeys);

      if (cancelled) {
        if (persistedUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(persistedUrl);
        }
        return;
      }

      if (persistedUrl) {
        applyUrl(persistedUrl, true);
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
        applyUrl(null);
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

      scheduleMediaBlobPersistence(cacheKeys, result.url, media.mimeType);
      applyUrl(result.url);
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
    media.mimeType,
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
