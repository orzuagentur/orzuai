"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  completeChatMediaUploadAction,
  prepareChatMediaUploadAction,
} from "@/features/chats/actions/send-chat-media";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { uploadChatAttachmentDirect } from "@/lib/client/upload-chat-attachment";
import type { ChatMessageData } from "@/types/chat.types";
import type { SendChatMessageResult } from "@/types/chat.types";

export type MediaUploadProgress = {
  percent: number;
  bytesPerSecond?: number;
  phase: NonNullable<ChatMessageData["uploadPhase"]>;
};

type SendMediaOptions = {
  onProgress?: (progress: MediaUploadProgress) => void;
};

type UseSendChatMediaOptions = {
  onSuccess?: (result: SendChatMessageResult) => void;
};

export function useSendChatMedia({ onSuccess }: UseSendChatMediaOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<MediaUploadProgress | null>(
    null,
  );

  const sendMedia = useCallback(
    async (
      conversationId: string,
      file: File,
      caption?: string,
      options?: SendMediaOptions,
    ) => {
      setIsLoading(true);

      const reportProgress = (progress: MediaUploadProgress) => {
        setUploadProgress(progress);
        options?.onProgress?.(progress);
      };

      try {
        reportProgress({ percent: 0, phase: "preparing" });

        const prepared = await prepareChatMediaUploadAction({
          conversationId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });

        if (!prepared.success) {
          toast.error(prepared.error.message);
          return {
            success: false as const,
            error: prepared.error,
          };
        }

        reportProgress({ percent: 0, phase: "uploading" });

        const uploaded = await uploadChatAttachmentDirect(
          file,
          prepared.data.path,
          {
            bucket: prepared.data.bucket,
            onProgress: (update) => {
              reportProgress({
                percent: update.percent,
                bytesPerSecond: update.bytesPerSecond,
                phase: "uploading",
              });
            },
          },
        );

        if (!uploaded.success) {
          const message = uploaded.error ?? CHAT_MESSAGES.mediaSendFailed;
          toast.error(message);
          return {
            success: false as const,
            error: {
              code: "SEND_FAILED" as const,
              message,
            },
          };
        }

        reportProgress({ percent: 100, phase: "completing" });

        const result = await completeChatMediaUploadAction({
          conversationId,
          path: prepared.data.path,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          caption,
        });

        if (result.success) {
          toast.success(CHAT_MESSAGES.mediaSendSuccess);
          onSuccess?.(result);
          return result;
        }

        toast.error(result.error.message);
        return result;
      } finally {
        setIsLoading(false);
        setUploadProgress(null);
      }
    },
    [onSuccess],
  );

  return {
    sendMedia,
    isLoading,
    uploadProgress,
  };
}
