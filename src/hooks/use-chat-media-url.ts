"use client";

import { useEffect, useState } from "react";

import { getChatMediaUrlAction } from "@/features/chats/actions/get-chat-media-url";
import type { ChatMediaPayload } from "@/utils/chat-media";
import { resolveMediaStoragePath } from "@/utils/chat-media";

type UseChatMediaUrlResult = {
  url: string | null;
  isLoading: boolean;
  error: boolean;
};

export function useChatMediaUrl(media: ChatMediaPayload): UseChatMediaUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const storagePath = resolveMediaStoragePath(media);
  const cacheKey = storagePath ?? media.url ?? media.fileName;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(false);

      if (media.url?.startsWith("blob:")) {
        setUrl(media.url);
        setError(false);
        setIsLoading(false);
        return;
      }

      if (!storagePath && !media.url) {
        setUrl(null);
        setIsLoading(false);
        setError(true);
        return;
      }

      const result = await getChatMediaUrlAction({
        path: media.path,
        url: media.url,
      });

      if (cancelled) {
        return;
      }

      if (result.success) {
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
  }, [cacheKey, media.path, media.url, storagePath]);

  return { url, isLoading, error };
}
