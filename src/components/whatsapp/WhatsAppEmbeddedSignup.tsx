"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Loader2Icon } from "lucide-react";

import { WhatsAppBusinessHelp } from "@/components/whatsapp/WhatsAppBusinessHelp";
import { Button } from "@/components/ui/button";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useCompleteEmbeddedSignup } from "@/hooks/use-complete-embedded-signup";
import { useMetaEmbeddedSignupFlow } from "@/hooks/use-meta-embedded-signup-flow";
import {
  isEmbeddedSignupFinishEvent,
  type EmbeddedSignupMessage,
} from "@/lib/whatsapp/embedded-signup";
import type { WhatsAppEmbeddedSignupConfig } from "@/types/whatsapp.types";

type WhatsAppEmbeddedSignupProps = {
  config: WhatsAppEmbeddedSignupConfig;
  onConnected?: () => void;
};

export function WhatsAppEmbeddedSignup({
  config,
  onConnected,
}: WhatsAppEmbeddedSignupProps) {
  const router = useRouter();

  const { completeSignup, isLoading } = useCompleteEmbeddedSignup({
    onSuccess: () => {
      router.refresh();
      onConnected?.();
    },
  });

  const mapFinishMessage = useCallback((message: EmbeddedSignupMessage) => {
    return {
      phoneNumberId: message.data.phone_number_id ?? "",
      wabaId: message.data.waba_id ?? "",
      businessAccountId: message.data.business_id,
      finishEvent: message.event,
    };
  }, []);

  const validateSignupData = useCallback(
    (data: {
      phoneNumberId: string;
      wabaId: string;
      finishEvent: string;
    }) => {
      if (
        !data.phoneNumberId ||
        !data.wabaId ||
        !isEmbeddedSignupFinishEvent(data.finishEvent)
      ) {
        return WHATSAPP_MESSAGES.signupPhoneNumberRequired;
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
      connectWaiting: WHATSAPP_MESSAGES.connectWaiting,
      connectFinishing: WHATSAPP_MESSAGES.connectFinishing,
      connectCancelled: WHATSAPP_MESSAGES.connectCancelled,
      connectMetaIncomplete: WHATSAPP_MESSAGES.connectMetaIncomplete,
      connectMissingCode: WHATSAPP_MESSAGES.connectMissingCode,
      signupIncomplete: WHATSAPP_MESSAGES.signupIncomplete,
    },
    mapFinishMessage,
    validateSignupData,
    completeSignup: async (payload) =>
      completeSignup({
        code: payload.code,
        phoneNumberId: payload.phoneNumberId,
        wabaId: payload.wabaId,
        businessAccountId: payload.businessAccountId,
        finishEvent: payload.finishEvent,
      }),
    handleSignupEvent: (event, _message, { setStatus, setStatusMessage }) => {
      if (event === "FINISH_ONLY_WABA") {
        setStatus("waba_only");
        setStatusMessage(WHATSAPP_MESSAGES.signupPhoneNumberRequired);
        return true;
      }

      return false;
    },
  });

  if (!config.isConfigured) {
    return (
      <p className="text-sm text-destructive">
        {WHATSAPP_MESSAGES.embeddedSignupNotConfigured}
      </p>
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
            {WHATSAPP_MESSAGES.connectFinishing}
          </>
        ) : (
          WHATSAPP_MESSAGES.connectButton
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

      {status === "waba_only" ? <WhatsAppBusinessHelp /> : null}
    </div>
  );
}
