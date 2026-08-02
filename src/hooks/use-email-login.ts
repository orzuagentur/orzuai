"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { signInWithEmailAction } from "@/features/auth/actions/sign-in-with-email";
import type { LoginResult, SignInWithEmailInput } from "@/types/auth.types";
import { getSafeRedirectPath } from "@/utils/auth-redirect";

type UseEmailLoginOptions = {
  nextPath?: string;
  onEmailNotVerified?: (email: string) => void;
};

export function useEmailLogin(options: UseEmailLoginOptions = {}) {
  const router = useRouter();
  const { nextPath, onEmailNotVerified } = options;
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(
    async (
      input: SignInWithEmailInput,
      turnstileToken?: string,
    ): Promise<LoginResult> => {
      setIsLoading(true);

      try {
        const result = await signInWithEmailAction(input, turnstileToken);

        if (result.success) {
          router.push(getSafeRedirectPath(nextPath));
          router.refresh();
          return result;
        }

        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          onEmailNotVerified?.(input.email);
        }

        toast.error(result.error.message);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [nextPath, onEmailNotVerified, router],
  );

  return {
    signIn,
    isLoading,
  };
}
