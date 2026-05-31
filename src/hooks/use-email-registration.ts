"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { registerWithEmailAction } from "@/features/auth/actions/register-with-email";
import type {
  RegisterWithEmailInput,
  RegistrationResult,
} from "@/types/auth.types";

type UseEmailRegistrationOptions = {
  onSuccess?: (email: string) => void;
  onError?: (message: string) => void;
};

export function useEmailRegistration(options: UseEmailRegistrationOptions = {}) {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);

  const register = useCallback(
    async (input: RegisterWithEmailInput): Promise<RegistrationResult> => {
      setIsLoading(true);

      try {
        const result = await registerWithEmailAction(input);

        if (result.success) {
          onSuccess?.(result.data.email);
          return result;
        }

        const message = result.error.message;
        onError?.(message);
        toast.error(message);

        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [onError, onSuccess],
  );

  return {
    register,
    isLoading,
  };
}
