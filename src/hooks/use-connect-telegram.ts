"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { connectTelegramBotAction } from "@/features/telegram/actions/connect-bot";
import { TELEGRAM_MESSAGES } from "@/features/telegram/constants";
import type {
  ConnectTelegramBotResult,
  TelegramConnectInput,
} from "@/types/telegram.types";

type UseConnectTelegramOptions = {
  onSuccess?: () => void;
};

export function useConnectTelegram({ onSuccess }: UseConnectTelegramOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const connectBot = useCallback(
    async (input: TelegramConnectInput): Promise<ConnectTelegramBotResult> => {
      setIsLoading(true);

      try {
        const result = await connectTelegramBotAction(input);

        if (result.success) {
          toast.success(TELEGRAM_MESSAGES.connectSuccess);
          onSuccess?.();
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
    connectBot,
    isLoading,
  };
}
