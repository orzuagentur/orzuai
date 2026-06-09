"use client";

import { useCallback, useState } from "react";
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
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (input: SendChatMessageInput): Promise<SendChatMessageResult> => {
      setIsLoading(true);

      try {
        const result = await sendChatMessageAction(input);

        if (result.success) {
          toast.success(CHAT_MESSAGES.sendSuccess);
          onSuccess?.(result);
          return result;
        }

        toast.error(result.error.message);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess],
  );

  return {
    sendMessage,
    isLoading,
  };
}
