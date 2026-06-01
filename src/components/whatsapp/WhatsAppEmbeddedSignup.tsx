"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { WhatsAppBusinessHelp } from "@/components/whatsapp/WhatsAppBusinessHelp";
import { Button } from "@/components/ui/button";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useCompleteEmbeddedSignup } from "@/hooks/use-complete-embedded-signup";
import {
  isTrustedEmbeddedSignupOrigin,
  isEmbeddedSignupFinishEvent,
  parseEmbeddedSignupMessage,
} from "@/lib/whatsapp/embedded-signup";
import type { WhatsAppEmbeddedSignupConfig } from "@/types/whatsapp.types";

type WhatsAppEmbeddedSignupProps = {
  config: WhatsAppEmbeddedSignupConfig;
};

type PendingSignupPayload = {
  code: string;
  phoneNumberId: string;
  wabaId: string;
  businessAccountId?: string;
  finishEvent: string;
};

type SignupStatus = "idle" | "waiting" | "finishing" | "error";

export function WhatsAppEmbeddedSignup({ config }: WhatsAppEmbeddedSignupProps) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [showBusinessHelp, setShowBusinessHelp] = useState(false);
  const [status, setStatus] = useState<SignupStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const authCodeRef = useRef<string | null>(null);
  const signupDataRef = useRef<Omit<PendingSignupPayload, "code"> | null>(null);
  const isSubmittingRef = useRef(false);
  const { completeSignup, isLoading } = useCompleteEmbeddedSignup({
    onSuccess: () => router.refresh(),
  });

  const submitSignup = useCallback(async () => {
    const code = authCodeRef.current;
    const signupData = signupDataRef.current;

    if (!code || !signupData || isSubmittingRef.current) {
      return;
    }

    if (
      !signupData.phoneNumberId ||
      !signupData.wabaId ||
      !isEmbeddedSignupFinishEvent(signupData.finishEvent)
    ) {
      setStatus("error");
      setStatusMessage(WHATSAPP_MESSAGES.signupPhoneNumberRequired);
      setShowBusinessHelp(true);
      return;
    }

    isSubmittingRef.current = true;
    setStatus("finishing");
    setStatusMessage("Finishing WhatsApp connection...");

    try {
      const result = await completeSignup({
        code,
        phoneNumberId: signupData.phoneNumberId,
        wabaId: signupData.wabaId,
        businessAccountId: signupData.businessAccountId,
        finishEvent: signupData.finishEvent,
      });

      if (!result.success) {
        setStatus("error");
        setStatusMessage(result.error.message);
        return;
      }

      setStatus("idle");
      setStatusMessage(null);
    } finally {
      isSubmittingRef.current = false;
      authCodeRef.current = null;
      signupDataRef.current = null;
    }
  }, [completeSignup]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isTrustedEmbeddedSignupOrigin(event.origin)) {
        return;
      }

      let payload: unknown = event.data;

      if (typeof event.data === "string") {
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
      }

      const message = parseEmbeddedSignupMessage(payload);

      if (!message) {
        return;
      }

      if (message.event === "CANCEL") {
        setStatus("error");
        setStatusMessage(WHATSAPP_MESSAGES.connectCancelled);
        setShowBusinessHelp(Boolean(message.data.current_step));
        return;
      }

      if (message.event === "ERROR") {
        setStatus("error");
        setStatusMessage(
          message.data.error_message ?? WHATSAPP_MESSAGES.signupIncomplete,
        );
        return;
      }

      if (message.event === "FINISH_ONLY_WABA") {
        setStatus("error");
        setStatusMessage(WHATSAPP_MESSAGES.signupPhoneNumberRequired);
        setShowBusinessHelp(true);
        return;
      }

      if (isEmbeddedSignupFinishEvent(message.event)) {
        signupDataRef.current = {
          phoneNumberId: message.data.phone_number_id ?? "",
          wabaId: message.data.waba_id ?? "",
          businessAccountId: message.data.business_id,
          finishEvent: message.event,
        };
        void submitSignup();
      }
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [submitSignup]);

  useEffect(() => {
    if (!sdkReady || !config.isConfigured) {
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: config.appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: config.graphApiVersion,
      });
    };

    if (window.FB) {
      window.fbAsyncInit?.();
    }
  }, [config.appId, config.graphApiVersion, config.isConfigured, sdkReady]);

  function launchEmbeddedSignup() {
    if (!config.isConfigured || !window.FB) {
      return;
    }

    setShowBusinessHelp(false);
    setStatus("waiting");
    setStatusMessage(WHATSAPP_MESSAGES.connectWaiting);
    authCodeRef.current = null;
    signupDataRef.current = null;

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;

        if (!code) {
          setStatus("error");
          setStatusMessage(WHATSAPP_MESSAGES.connectMissingCode);
          return;
        }

        authCodeRef.current = code;
        void submitSignup();
      },
      {
        config_id: config.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: "3",
          setup: {},
        },
      },
    );
  }

  if (!config.isConfigured) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {WHATSAPP_MESSAGES.embeddedSignupNotConfigured}
        </p>
        <WhatsAppBusinessHelp />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={() => setSdkReady(true)}
      />

      <p className="text-sm text-muted-foreground">
        {WHATSAPP_MESSAGES.connectDescription}
      </p>

      <Button
        type="button"
        size="lg"
        disabled={!sdkReady || isLoading || status === "finishing"}
        onClick={launchEmbeddedSignup}
      >
        {isLoading || status === "finishing" ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Connecting...
          </>
        ) : (
          WHATSAPP_MESSAGES.connectTitle
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

      {showBusinessHelp ? <WhatsAppBusinessHelp /> : null}
    </div>
  );
}
