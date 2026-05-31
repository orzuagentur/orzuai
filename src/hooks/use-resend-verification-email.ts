"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { resendVerificationEmailAction } from "@/features/auth/actions/resend-verification-email";
import { VERIFICATION_MESSAGES } from "@/features/auth/constants";
import type {
  ResendVerificationEmailInput,
  VerificationResult,
} from "@/types/auth.types";

export function useResendVerificationEmail() {
  const [isLoading, setIsLoading] = useState(false);

  const resend = useCallback(
    async (
      input: ResendVerificationEmailInput,
    ): Promise<VerificationResult> => {
      setIsLoading(true);

      try {
        const result = await resendVerificationEmailAction(input);

        if (result.success) {
          toast.success(VERIFICATION_MESSAGES.resendSuccess);
        } else {
          toast.error(result.error.message);
        }

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    resend,
    isLoading,
  };
}
