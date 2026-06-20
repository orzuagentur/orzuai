"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { toggleChatAiAction } from "@/features/chats/actions/toggle-chat-ai";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  captureChannelAiOverride,
  restoreChannelAiOverride,
  syncChannelAiEnabled,
} from "@/lib/client/channel-ai-sync-store";
import type { ToggleChatAiInput, ToggleChatAiResult } from "@/types/chat.types";

type UseToggleChatAiOptions = {
  onSuccess?: (enabled: boolean) => void;
};

export function useToggleChatAi({ onSuccess }: UseToggleChatAiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const toggleAi = useCallback(
    async (input: ToggleChatAiInput): Promise<ToggleChatAiResult> => {
      const previousOverride = captureChannelAiOverride(input.channel);

      syncChannelAiEnabled(input.channel, input.enabled);
      setIsLoading(true);

      try {
        const result = await toggleChatAiAction(input);

        if (result.success) {
          syncChannelAiEnabled(input.channel, result.data.aiEnabled);
          toast.success(
            result.data.aiEnabled
              ? CHAT_MESSAGES.aiEnabledSuccess
              : CHAT_MESSAGES.aiDisabledSuccess,
          );
          onSuccess?.(result.data.aiEnabled);
          return result;
        }

        restoreChannelAiOverride(input.channel, previousOverride);
        toast.error(result.error.message);
        return result;
      } catch {
        restoreChannelAiOverride(input.channel, previousOverride);
        toast.error(CHAT_MESSAGES.aiToggleFailed);
        return {
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message: CHAT_MESSAGES.aiToggleFailed,
          },
        };
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
