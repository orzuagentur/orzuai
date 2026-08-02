"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AUTH_ROUTES } from "@/constants/routes";
import { signInWithMagicLinkAction } from "@/features/auth/actions/sign-in-with-magic-link";
import type {
  MagicLinkResult,
  SignInWithMagicLinkInput,
} from "@/types/auth.types";

export function useMagicLinkLogin(nextPath?: string) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const sendMagicLink = useCallback(
    async (
      input: SignInWithMagicLinkInput,
      turnstileToken?: string,
    ): Promise<MagicLinkResult> => {
      setIsLoading(true);

      try {
        const result = await signInWithMagicLinkAction(
          input,
          nextPath,
          turnstileToken,
        );

        if (!result.success) {
          toast.error(result.error.message);
          return result;
        }

        const confirmationUrl = new URL(
          AUTH_ROUTES.magicLinkConfirmation,
          window.location.origin,
        );
        confirmationUrl.searchParams.set("email", result.data.email);
        router.push(`${confirmationUrl.pathname}${confirmationUrl.search}`);

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [nextPath, router],
  );

  return {
    sendMagicLink,
    isLoading,
  };
}
