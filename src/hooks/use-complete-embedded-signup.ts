"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { completeEmbeddedSignupAction } from "@/features/whatsapp/actions/complete-embedded-signup";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  CompleteEmbeddedSignupInput,
  CompleteEmbeddedSignupResult,
} from "@/types/whatsapp.types";

type UseCompleteEmbeddedSignupOptions = {
  onSuccess?: () => void;
};

export function useCompleteEmbeddedSignup({
  onSuccess,
}: UseCompleteEmbeddedSignupOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const completeSignup = useCallback(
    async (
      input: CompleteEmbeddedSignupInput,
    ): Promise<CompleteEmbeddedSignupResult> => {
      setIsLoading(true);

      try {
        const result = await completeEmbeddedSignupAction(input);

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
    completeSignup,
    isLoading,
  };
}
