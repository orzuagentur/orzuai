"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { deleteAccountAction } from "@/features/auth/actions/delete-account";
import { ACCOUNT_DELETION_MESSAGES } from "@/features/auth/constants";
import type { DeleteAccountInput } from "@/types/auth.types";

export function useDeleteAccount() {
  const [isLoading, setIsLoading] = useState(false);

  const deleteAccount = useCallback(async (input: DeleteAccountInput) => {
    setIsLoading(true);

    try {
      await deleteAccountAction(input);
      toast.success(ACCOUNT_DELETION_MESSAGES.success);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : ACCOUNT_DELETION_MESSAGES.genericError;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    deleteAccount,
    isLoading,
  };
}
