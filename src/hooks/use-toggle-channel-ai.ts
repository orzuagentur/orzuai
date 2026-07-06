"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { toggleChannelAiAction } from "@/features/channel-workspace/actions/toggle-channel-ai";
import type { AiAgentChannelId } from "@/features/integrations/constants";

type UseToggleChannelAiOptions = {
  onSuccess?: (enabled: boolean) => void;
};

export function useToggleChannelAi({ onSuccess }: UseToggleChannelAiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const toggleChannelAi = useCallback(
    async (channel: AiAgentChannelId, enabled: boolean) => {
      setIsLoading(true);

      try {
        const result = await toggleChannelAiAction(channel, enabled);

        if (result.success) {
          toast.success(
            enabled
              ? AI_ASSISTANT_MESSAGES.channelAiEnabledSuccess
              : AI_ASSISTANT_MESSAGES.channelAiDisabledSuccess,
          );
          onSuccess?.(enabled);
          return { success: true as const, enabled };
        }

        toast.error(result.message ?? AI_ASSISTANT_MESSAGES.channelAiToggleFailed);
        return {
          success: false as const,
          message: result.message ?? AI_ASSISTANT_MESSAGES.channelAiToggleFailed,
        };
      } catch {
        toast.error(AI_ASSISTANT_MESSAGES.channelAiToggleFailed);
        return {
          success: false as const,
          message: AI_ASSISTANT_MESSAGES.channelAiToggleFailed,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess],
  );

  return { toggleChannelAi, isLoading };
}
