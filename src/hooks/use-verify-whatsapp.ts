"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { verifyWhatsAppAction } from "@/features/whatsapp/actions/verify-whatsapp";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  VerifyWhatsAppInput,
  VerifyWhatsAppResult,
} from "@/types/whatsapp.types";

type UseVerifyWhatsAppOptions = {
  onSuccess?: () => void;
};

export function useVerifyWhatsApp({ onSuccess }: UseVerifyWhatsAppOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const verify = useCallback(
    async (input: VerifyWhatsAppInput): Promise<VerifyWhatsAppResult> => {
      setIsLoading(true);

      try {
        const result = await verifyWhatsAppAction(input);

        if (result.success) {
          toast.success(WHATSAPP_MESSAGES.verifySuccess);
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
    verify,
    isLoading,
  };
}
