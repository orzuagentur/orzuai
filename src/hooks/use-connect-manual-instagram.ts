"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { connectManualInstagramAction } from "@/features/instagram/actions/connect-manual-instagram";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import type {
  ConnectManualInstagramInput,
  ConnectManualInstagramResult,
} from "@/types/instagram.types";

type UseConnectManualInstagramOptions = {
  onSuccess?: () => void;
};

export function useConnectManualInstagram({
  onSuccess,
}: UseConnectManualInstagramOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const connect = useCallback(
    async (
      input: ConnectManualInstagramInput,
    ): Promise<ConnectManualInstagramResult> => {
      setIsLoading(true);

      try {
        const result = await connectManualInstagramAction(input);

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
    connect,
    isLoading,
  };
}
