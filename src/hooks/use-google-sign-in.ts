"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { signInWithGoogle } from "@/features/auth/google-sign-in";
import type { AuthActionResult } from "@/types/auth.types";

type UseGoogleSignInOptions = {
  nextPath?: string;
  onError?: (message: string) => void;
};

export function useGoogleSignIn(options: UseGoogleSignInOptions = {}) {
  const { nextPath, onError } = options;
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async (): Promise<AuthActionResult> => {
    setIsLoading(true);

    try {
      const result = await signInWithGoogle(nextPath);

      if (!result.success) {
        const message = result.error;
        onError?.(message);
        toast.error(message);
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, [nextPath, onError]);

  return {
    signIn,
    isLoading,
  };
}
