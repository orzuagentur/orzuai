"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { toggleChatAiAction } from "@/features/chats/actions/toggle-chat-ai";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import type { ToggleChatAiInput, ToggleChatAiResult } from "@/types/chat.types";

type UseToggleChatAiOptions = {
  onSuccess?: (enabled: boolean) => void;
};

export function useToggleChatAi({ onSuccess }: UseToggleChatAiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const toggleAi = useCallback(
    async (input: ToggleChatAiInput): Promise<ToggleChatAiResult> => {
      setIsLoading(true);

      try {
        const result = await toggleChatAiAction(input);

        if (result.success) {
          toast.success(
            input.enabled
              ? CHAT_MESSAGES.aiEnabledSuccess
              : CHAT_MESSAGES.aiDisabledSuccess,
          );
          onSuccess?.(result.data.aiEnabled);
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
    toggleAi,
    isLoading,
  };
}
