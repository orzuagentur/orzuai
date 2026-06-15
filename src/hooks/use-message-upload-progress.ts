"use client";

import { useSyncExternalStore } from "react";

import {
  getMessageUploadProgress,
  subscribeMessageUploadProgress,
  type MessageUploadProgressState,
} from "@/lib/client/message-upload-progress-store";

const EMPTY_PROGRESS: MessageUploadProgressState | null = null;

export function useMessageUploadProgress(
  messageId: string | undefined,
  enabled: boolean,
): MessageUploadProgressState | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!enabled || !messageId) {
        return () => {};
      }

      return subscribeMessageUploadProgress(messageId, onStoreChange);
    },
    () => {
      if (!enabled || !messageId) {
        return EMPTY_PROGRESS;
      }

      return getMessageUploadProgress(messageId);
    },
    () => EMPTY_PROGRESS,
  );
}
