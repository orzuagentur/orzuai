"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { complete360DialogEmbeddedSignupAction } from "@/features/whatsapp/actions/complete-embedded-signup";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  Complete360DialogEmbeddedSignupInput,
  Complete360DialogEmbeddedSignupResult,
} from "@/types/whatsapp.types";

type UseComplete360DialogEmbeddedSignupOptions = {
  onSuccess?: () => void;
};

export function useComplete360DialogEmbeddedSignup({
  onSuccess,
}: UseComplete360DialogEmbeddedSignupOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const complete = useCallback(
    async (
      input: Complete360DialogEmbeddedSignupInput,
    ): Promise<Complete360DialogEmbeddedSignupResult> => {
      setIsLoading(true);

      try {
        const result = await complete360DialogEmbeddedSignupAction(input);

        if (result.success) {
          if (result.data.activationStatus === "connected") {
            toast.success(WHATSAPP_MESSAGES.embeddedConnectSuccess);
          } else {
            toast.message(WHATSAPP_MESSAGES.embeddedConnectPending);
          }

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
    complete,
    isLoading,
  };
}
