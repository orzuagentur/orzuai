"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { signInWithGoogleAction } from "@/features/auth/actions/sign-in-with-google";
import type { GoogleSignInResult } from "@/types/auth.types";

type UseGoogleSignInOptions = {
  nextPath?: string;
  onError?: (message: string) => void;
};

export function useGoogleSignIn(options: UseGoogleSignInOptions = {}) {
  const { nextPath, onError } = options;
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async (): Promise<GoogleSignInResult> => {
    setIsLoading(true);

    try {
      const result = await signInWithGoogleAction(nextPath);

      if (!result.success) {
        onError?.(result.error);
        toast.error(result.error);
        return result;
      }

      window.location.assign(result.redirectUrl);
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
