"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  completeChatMediaUploadAction,
  prepareChatMediaUploadAction,
} from "@/features/chats/actions/send-chat-media";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { generateClientImageThumbnail } from "@/lib/client/generate-image-thumbnail";
import {
  getChatAttachmentSignedUrlClient,
  uploadChatAttachmentBlob,
  uploadChatAttachmentDirect,
} from "@/lib/client/upload-chat-attachment";
import type { ChatMessageData } from "@/types/chat.types";
import type { SendChatMessageResult } from "@/types/chat.types";
import { buildThumbnailStoragePath } from "@/utils/chat-attachment-path";

export type MediaUploadProgress = {
  percent: number;
  bytesPerSecond?: number;
  phase: NonNullable<ChatMessageData["uploadPhase"]>;
};

type SendMediaOptions = {
  onProgress?: (progress: MediaUploadProgress) => void;
};

const PREPARE_MEDIA_TIMEOUT_MS = 20_000;
const COMPLETE_MEDIA_TIMEOUT_MS = 30_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

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

        const prepared = await withTimeout(
          prepareChatMediaUploadAction({
            conversationId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
          PREPARE_MEDIA_TIMEOUT_MS,
          CHAT_MESSAGES.mediaUploadPreparing,
        );

        if (!prepared.success) {
          toast.error(prepared.error.message);
          return {
            success: false as const,
            error: prepared.error,
          };
        }

        reportProgress({ percent: 0, phase: "uploading" });

        const mimeType = file.type || "application/octet-stream";
        const thumbPromise =
          mimeType.startsWith("image/")
            ? generateClientImageThumbnail(file)
            : Promise.resolve(null);

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

        const thumbnail = await thumbPromise;
        let thumbPath: string | undefined;
        let thumbWidth: number | undefined;
        let thumbHeight: number | undefined;

        if (thumbnail) {
          thumbPath = buildThumbnailStoragePath(prepared.data.path);
          const thumbUploaded = await uploadChatAttachmentBlob(
            thumbnail.blob,
            thumbPath,
            { bucket: prepared.data.bucket },
          );

          if (thumbUploaded.success) {
            thumbWidth = thumbnail.width;
            thumbHeight = thumbnail.height;
          } else {
            thumbPath = undefined;
          }
        }

        reportProgress({ percent: 100, phase: "completing" });

        const result = await withTimeout(
          completeChatMediaUploadAction({
            conversationId,
            path: prepared.data.path,
            fileName: file.name,
            mimeType,
            sizeBytes: file.size,
            caption,
            thumbPath,
            thumbWidth,
            thumbHeight,
          }),
          COMPLETE_MEDIA_TIMEOUT_MS,
          CHAT_MESSAGES.mediaUploadCompleting,
        );

        if (result.success) {
          const mediaSignedUrl = await getChatAttachmentSignedUrlClient(
            prepared.data.path,
            prepared.data.bucket,
          );

          const enrichedResult: SendChatMessageResult = mediaSignedUrl
            ? {
                ...result,
                data: {
                  ...result.data,
                  mediaSignedUrl,
                },
              }
            : result;

          toast.success(CHAT_MESSAGES.mediaSendSuccess);
          onSuccess?.(enrichedResult);
          return enrichedResult;
        }

        toast.error(result.error.message);
        return result;
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : CHAT_MESSAGES.mediaSendFailed;
        toast.error(message);
        return {
          success: false as const,
          error: {
            code: "SEND_FAILED" as const,
            message,
          },
        };
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
