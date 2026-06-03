"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { completeInstagramEmbeddedSignupAction } from "@/features/instagram/actions/complete-embedded-signup";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import type {
  CompleteInstagramEmbeddedSignupInput,
  CompleteInstagramEmbeddedSignupResult,
} from "@/types/instagram.types";

type UseCompleteInstagramSignupOptions = {
  onSuccess?: () => void;
};

export function useCompleteInstagramSignup({
  onSuccess,
}: UseCompleteInstagramSignupOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const completeSignup = useCallback(
    async (
      input: CompleteInstagramEmbeddedSignupInput,
    ): Promise<CompleteInstagramEmbeddedSignupResult> => {
      setIsLoading(true);

      try {
        const result = await completeInstagramEmbeddedSignupAction(input);

        if (result.success) {
          toast.success(INSTAGRAM_MESSAGES.connectSuccess);
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
