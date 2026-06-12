"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { sendChatMediaAction } from "@/features/chats/actions/send-chat-media";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import type { SendChatMessageResult } from "@/types/chat.types";

type UseSendChatMediaOptions = {
  onSuccess?: (result: SendChatMessageResult) => void;
};

export function useSendChatMedia({ onSuccess }: UseSendChatMediaOptions = {}) {
  const sendMedia = useCallback(
    async (conversationId: string, file: File, caption?: string) => {
      const formData = new FormData();
      formData.set("conversationId", conversationId);
      formData.set("file", file);

      if (caption?.trim()) {
        formData.set("caption", caption.trim());
      }

      const result = await sendChatMediaAction(formData);

      if (result.success) {
        toast.success(CHAT_MESSAGES.mediaSendSuccess);
        onSuccess?.(result);
        return result;
      }

      toast.error(result.error.message);
      return result;
    },
    [onSuccess],
  );

  return {
    sendMedia,
    isLoading: false,
  };
}
