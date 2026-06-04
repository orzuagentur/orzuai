"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { connectManualWhatsAppAction } from "@/features/whatsapp/actions/connect-manual-whatsapp";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  ConnectManualWhatsAppInput,
  ConnectManualWhatsAppResult,
} from "@/types/whatsapp.types";

type UseConnectManualWhatsAppOptions = {
  onSuccess?: () => void;
};

export function useConnectManualWhatsApp({
  onSuccess,
}: UseConnectManualWhatsAppOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const connect = useCallback(
    async (
      input: ConnectManualWhatsAppInput,
    ): Promise<ConnectManualWhatsAppResult> => {
      setIsLoading(true);

      try {
        const result = await connectManualWhatsAppAction(input);

        if (result.success) {
          toast.success(WHATSAPP_MESSAGES.connectSuccess);
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
    connect,
    isLoading,
  };
}
