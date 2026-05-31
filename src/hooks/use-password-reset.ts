"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { updatePasswordAction } from "@/features/auth/actions/update-password";
import { AUTH_ROUTES } from "@/constants/routes";
import { PASSWORD_RESET_MESSAGES } from "@/features/auth/constants";
import type {
  PasswordUpdateResult,
  ResetPasswordInput,
} from "@/types/auth.types";

export function usePasswordReset() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const resetPassword = useCallback(
    async (input: ResetPasswordInput): Promise<PasswordUpdateResult> => {
      setIsLoading(true);

      try {
        const result = await updatePasswordAction(input);

        if (result.success) {
          toast.success(PASSWORD_RESET_MESSAGES.successDescription);
          router.push(AUTH_ROUTES.resetPasswordSuccess);
          router.refresh();
          return result;
        }

        toast.error(result.error.message);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  return {
    resetPassword,
    isLoading,
  };
}
