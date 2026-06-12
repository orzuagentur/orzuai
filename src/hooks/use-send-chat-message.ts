"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { sendChatMessageAction } from "@/features/chats/actions/send-chat-message";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import type {
  SendChatMessageInput,
  SendChatMessageResult,
} from "@/types/chat.types";

type UseSendChatMessageOptions = {
  onSuccess?: (result: SendChatMessageResult) => void;
};

export function useSendChatMessage({ onSuccess }: UseSendChatMessageOptions = {}) {
  const sendMessage = useCallback(
    async (input: SendChatMessageInput): Promise<SendChatMessageResult> => {
      const result = await sendChatMessageAction(input);

      if (result.success) {
        toast.success(CHAT_MESSAGES.sendSuccess);
        onSuccess?.(result);
        return result;
      }

      toast.error(result.error.message);
      return result;
    },
    [onSuccess],
  );

  return {
    sendMessage,
    isLoading: false,
  };
}
