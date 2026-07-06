"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { enableWebsiteChatAction } from "@/features/website-chat/actions/enable-website-chat";
import { WEBSITE_CHAT_MESSAGES } from "@/features/website-chat/constants";

type UseEnableWebsiteChatOptions = {
  onSuccess?: (siteKey?: string) => void;
};

export function useEnableWebsiteChat(options?: UseEnableWebsiteChatOptions) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function enableChat() {
    startTransition(async () => {
      const result = await enableWebsiteChatAction();

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(WEBSITE_CHAT_MESSAGES.connectSuccess);
      options?.onSuccess?.(result.siteKey);
      router.refresh();
    });
  }

  return { enableChat, isLoading: isPending };
}
