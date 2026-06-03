"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import { useCompleteInstagramSignup } from "@/hooks/use-complete-instagram-signup";
import {
  isTrustedEmbeddedSignupOrigin,
  isEmbeddedSignupFinishEvent,
  parseEmbeddedSignupMessage,
} from "@/lib/whatsapp/embedded-signup";
import type { InstagramEmbeddedSignupConfig } from "@/types/instagram.types";

type InstagramEmbeddedSignupProps = {
  config: InstagramEmbeddedSignupConfig;
};

type PendingSignupPayload = {
  code: string;
  pageId: string;
  igUserId: string;
  businessAccountId?: string;
  finishEvent: string;
};

type SignupStatus = "idle" | "waiting" | "finishing" | "error";

export function InstagramEmbeddedSignup({ config }: InstagramEmbeddedSignupProps) {
  const router = useRouter();
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<SignupStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const authCodeRef = useRef<string | null>(null);
  const signupDataRef = useRef<Omit<PendingSignupPayload, "code"> | null>(null);
  const isSubmittingRef = useRef(false);
  const { completeSignup, isLoading } = useCompleteInstagramSignup({
    onSuccess: () => router.refresh(),
  });

  const submitSignup = useCallback(async () => {
    const code = authCodeRef.current;
    const signupData = signupDataRef.current;

    if (!code || !signupData || isSubmittingRef.current) {
      return;
    }

    if (
      !signupData.pageId ||
      !signupData.igUserId ||
      !isEmbeddedSignupFinishEvent(signupData.finishEvent)
    ) {
      setStatus("error");
      setStatusMessage(INSTAGRAM_MESSAGES.signupPageRequired);
      return;
    }

    isSubmittingRef.current = true;
    setStatus("finishing");
    setStatusMessage("Finishing Instagram connection...");

    try {
      const result = await completeSignup({
        code,
        pageId: signupData.pageId,
        igUserId: signupData.igUserId,
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
        setStatusMessage(INSTAGRAM_MESSAGES.connectCancelled);
        return;
      }

      if (message.event === "ERROR") {
        setStatus("error");
        setStatusMessage(
          message.data.error_message ?? INSTAGRAM_MESSAGES.signupIncomplete,
        );
        return;
      }

      if (isEmbeddedSignupFinishEvent(message.event)) {
        signupDataRef.current = {
          pageId: message.data.phone_number_id ?? message.data.page_id ?? "",
          igUserId:
            message.data.instagram_account_id ?? message.data.waba_id ?? "",
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

    setStatus("waiting");
    setStatusMessage(INSTAGRAM_MESSAGES.connectWaiting);
    authCodeRef.current = null;
    signupDataRef.current = null;

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;

        if (!code) {
          setStatus("error");
          setStatusMessage(INSTAGRAM_MESSAGES.connectMissingCode);
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
        disabled={!sdkReady || isLoading || status === "finishing"}
        onClick={launchEmbeddedSignup}
      >
        {isLoading || status === "finishing" ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Connecting...
          </>
        ) : (
          INSTAGRAM_MESSAGES.connectWithFacebook
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
