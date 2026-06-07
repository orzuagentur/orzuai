"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import { useCompleteInstagramSignup } from "@/hooks/use-complete-instagram-signup";
import { useMetaEmbeddedSignupFlow } from "@/hooks/use-meta-embedded-signup-flow";
import {
  isEmbeddedSignupFinishEvent,
  type EmbeddedSignupMessage,
} from "@/lib/whatsapp/embedded-signup";
import type { InstagramEmbeddedSignupConfig } from "@/types/instagram.types";

type InstagramEmbeddedSignupProps = {
  config: InstagramEmbeddedSignupConfig;
};

export function InstagramEmbeddedSignup({ config }: InstagramEmbeddedSignupProps) {
  const router = useRouter();

  const { completeSignup, isLoading } = useCompleteInstagramSignup({
    onSuccess: () => router.refresh(),
  });

  const mapFinishMessage = useCallback((message: EmbeddedSignupMessage) => {
    return {
      pageId: message.data.page_id ?? message.data.phone_number_id ?? "",
      igUserId:
        message.data.instagram_account_id ?? message.data.waba_id ?? "",
      businessAccountId: message.data.business_id,
      finishEvent: message.event,
    };
  }, []);

  const validateSignupData = useCallback(
    (data: { pageId: string; igUserId: string; finishEvent: string }) => {
      if (
        !data.pageId ||
        !data.igUserId ||
        !isEmbeddedSignupFinishEvent(data.finishEvent)
      ) {
        return INSTAGRAM_MESSAGES.signupPageRequired;
      }

      return null;
    },
    [],
  );

  const {
    sdkReady,
    setSdkReady,
    status,
    statusMessage,
    launchEmbeddedSignup,
    isFinishing,
  } = useMetaEmbeddedSignupFlow({
    config,
    messages: {
      connectWaiting: INSTAGRAM_MESSAGES.connectWaiting,
      connectFinishing: INSTAGRAM_MESSAGES.connectFinishing,
      connectCancelled: INSTAGRAM_MESSAGES.connectCancelled,
      connectMissingCode: INSTAGRAM_MESSAGES.connectMissingCode,
      signupIncomplete: INSTAGRAM_MESSAGES.signupIncomplete,
    },
    mapFinishMessage,
    validateSignupData,
    completeSignup: async (payload) =>
      completeSignup({
        code: payload.code,
        pageId: payload.pageId,
        igUserId: payload.igUserId,
        businessAccountId: payload.businessAccountId,
        finishEvent: payload.finishEvent,
      }),
  });

  if (!config.isConfigured) {
    return (
      <p className="text-sm text-destructive">{INSTAGRAM_MESSAGES.notConfigured}</p>
    );
  }

  return (
    <div className="space-y-4">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={() => setSdkReady(true)}
      />

      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        disabled={!sdkReady || isLoading || isFinishing}
        onClick={launchEmbeddedSignup}
      >
        {isLoading || isFinishing ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            {INSTAGRAM_MESSAGES.connectFinishing}
          </>
        ) : (
          INSTAGRAM_MESSAGES.connectButton
        )}
      </Button>

      {statusMessage ? (
        <p
          className={`text-sm ${
            status === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
