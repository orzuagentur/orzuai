"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { enableWebsiteFormsAction } from "@/features/website-forms/actions/enable-website-forms";
import { WEBSITE_FORMS_MESSAGES } from "@/features/website-forms/constants";

type UseEnableWebsiteFormsOptions = {
  onSuccess?: (apiKey: string) => void;
};

export function useEnableWebsiteForms(options?: UseEnableWebsiteFormsOptions) {
  const [isPending, startTransition] = useTransition();

  function enableForms() {
    startTransition(async () => {
      const result = await enableWebsiteFormsAction();

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      const apiKey = result.data.apiKey;

      toast.success(WEBSITE_FORMS_MESSAGES.connectSuccess);
      options?.onSuccess?.(apiKey);
    });
  }

  return { enableForms, isLoading: isPending };
}
