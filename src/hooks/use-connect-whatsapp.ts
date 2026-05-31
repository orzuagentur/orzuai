"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { connectWhatsAppAction } from "@/features/whatsapp/actions/connect-whatsapp";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  ConnectWhatsAppInput,
  ConnectWhatsAppResult,
} from "@/types/whatsapp.types";

type UseConnectWhatsAppOptions = {
  onSuccess?: (connectionId: string) => void;
};

export function useConnectWhatsApp({ onSuccess }: UseConnectWhatsAppOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const connect = useCallback(
    async (input: ConnectWhatsAppInput): Promise<ConnectWhatsAppResult> => {
      setIsLoading(true);

      try {
        const result = await connectWhatsAppAction(input);

        if (result.success) {
          toast.success(WHATSAPP_MESSAGES.connectSuccess);
          onSuccess?.(result.data.connection.id);
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
    connect,
    isLoading,
  };
}
