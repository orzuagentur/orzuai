"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { requestPasswordResetAction } from "@/features/auth/actions/request-password-reset";
import { AUTH_ROUTES } from "@/constants/routes";
import type {
  PasswordResetRequestResult,
  RequestPasswordResetInput,
} from "@/types/auth.types";

export function usePasswordResetRequest() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const requestReset = useCallback(
    async (
      input: RequestPasswordResetInput,
    ): Promise<PasswordResetRequestResult> => {
      setIsLoading(true);

      try {
        const result = await requestPasswordResetAction(input);

        if (!result.success) {
          toast.error(result.error.message);
          return result;
        }

        const confirmationUrl = new URL(
          AUTH_ROUTES.forgotPasswordConfirmation,
          window.location.origin,
        );
        confirmationUrl.searchParams.set("email", result.data.email);
        router.push(`${confirmationUrl.pathname}${confirmationUrl.search}`);

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  return {
    requestReset,
    isLoading,
  };
}
