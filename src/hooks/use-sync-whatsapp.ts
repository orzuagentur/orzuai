"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { syncWhatsAppAction } from "@/features/whatsapp/actions/sync-whatsapp";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type { SyncWhatsAppResult } from "@/types/whatsapp.types";

type UseSyncWhatsAppOptions = {
  onSuccess?: () => void;
};

export function useSyncWhatsApp({ onSuccess }: UseSyncWhatsAppOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const sync = useCallback(async (): Promise<SyncWhatsAppResult> => {
    setIsLoading(true);

    try {
      const result = await syncWhatsAppAction();

      if (result.success) {
        toast.success(WHATSAPP_MESSAGES.syncSuccess);
        onSuccess?.();
        return result;
      }

      toast.error(result.error.message);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  return {
    sync,
    isLoading,
  };
}
