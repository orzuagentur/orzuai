"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  EMBEDDED_SIGNUP_FB_LOGIN_EXTRAS,
  EMBEDDED_SIGNUP_MISSING_CODE_DELAY_MS,
  isEmbeddedSignupFinishEvent,
  isFbLoginCancelled,
  isTrustedEmbeddedSignupOrigin,
  parseEmbeddedSignupMessage,
  type EmbeddedSignupMessage,
} from "@/lib/whatsapp/embedded-signup";
import type { FacebookLoginResponse } from "@/types/meta-sdk";

export type MetaEmbeddedSignupConfig = {
  appId: string;
  configId: string;
  graphApiVersion: string;
  isConfigured: boolean;
};

export type MetaEmbeddedSignupMessages = {
  connectWaiting: string;
  connectFinishing: string;
  connectCancelled: string;
  connectMissingCode: string;
  signupIncomplete: string;
};

type SignupStatus =
  | "idle"
  | "waiting"
  | "finishing"
  | "error"
  | "waba_only"
  | (string & {});

type UseMetaEmbeddedSignupFlowOptions<TSignupData extends { finishEvent: string }> =
  {
    config: MetaEmbeddedSignupConfig;
    messages: MetaEmbeddedSignupMessages;
    mapFinishMessage: (message: EmbeddedSignupMessage) => TSignupData | null;
    validateSignupData: (data: TSignupData) => string | null;
    completeSignup: (
      payload: TSignupData & { code: string },
    ) => Promise<{ success: boolean; error?: { message: string } }>;
    handleSignupEvent?: (
      event: EmbeddedSignupMessage["event"],
      message: EmbeddedSignupMessage,
      helpers: {
        setStatus: (status: SignupStatus) => void;
        setStatusMessage: (message: string | null) => void;
      },
    ) => boolean;
  };

export function useMetaEmbeddedSignupFlow<
  TSignupData extends { finishEvent: string },
>({
  config,
  messages,
  mapFinishMessage,
  validateSignupData,
  completeSignup,
  handleSignupEvent,
}: UseMetaEmbeddedSignupFlowOptions<TSignupData>) {
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<SignupStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const authCodeRef = useRef<string | null>(null);
  const signupDataRef = useRef<TSignupData | null>(null);
  const isSubmittingRef = useRef(false);
  const missingCodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearMissingCodeTimeout = useCallback(() => {
    if (missingCodeTimeoutRef.current) {
      clearTimeout(missingCodeTimeoutRef.current);
      missingCodeTimeoutRef.current = null;
    }
  }, []);

  const submitSignup = useCallback(async () => {
    const code = authCodeRef.current;
    const signupData = signupDataRef.current;

    if (!code || !signupData || isSubmittingRef.current) {
      return;
    }

    const validationError = validateSignupData(signupData);

    if (validationError) {
      clearMissingCodeTimeout();
      setStatus("error");
      setStatusMessage(validationError);
      return;
    }

    isSubmittingRef.current = true;
    clearMissingCodeTimeout();
    setStatus("finishing");
    setStatusMessage(messages.connectFinishing);

    try {
      const result = await completeSignup({ ...signupData, code });

      if (!result.success) {
        setStatus("error");
        setStatusMessage(result.error?.message ?? messages.signupIncomplete);
        return;
      }

      setStatus("idle");
      setStatusMessage(null);
    } finally {
      isSubmittingRef.current = false;
      authCodeRef.current = null;
      signupDataRef.current = null;
    }
  }, [
    clearMissingCodeTimeout,
    completeSignup,
    messages.connectFinishing,
    messages.signupIncomplete,
    validateSignupData,
  ]);

  const maybeSubmitSignup = useCallback(() => {
    void submitSignup();
  }, [submitSignup]);

  const scheduleMissingCodeError = useCallback(() => {
    clearMissingCodeTimeout();
    missingCodeTimeoutRef.current = setTimeout(() => {
      if (authCodeRef.current || isSubmittingRef.current) {
        return;
      }

      setStatus("error");
      setStatusMessage(
        signupDataRef.current
          ? messages.connectMissingCode
          : messages.connectCancelled,
      );
    }, EMBEDDED_SIGNUP_MISSING_CODE_DELAY_MS);
  }, [
    clearMissingCodeTimeout,
    messages.connectCancelled,
    messages.connectMissingCode,
  ]);

  const handleFbLoginResponse = useCallback(
    (response: FacebookLoginResponse) => {
      const code = response.authResponse?.code;

      if (code) {
        authCodeRef.current = code;
        maybeSubmitSignup();
        return;
      }

      if (isFbLoginCancelled(response)) {
        clearMissingCodeTimeout();
        setStatus("error");
        setStatusMessage(messages.connectCancelled);
        return;
      }

      scheduleMissingCodeError();
    },
    [
      clearMissingCodeTimeout,
      maybeSubmitSignup,
      messages.connectCancelled,
      scheduleMissingCodeError,
    ],
  );

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
        clearMissingCodeTimeout();
        setStatus("error");
        setStatusMessage(messages.connectCancelled);
        return;
      }

      if (message.event === "ERROR") {
        clearMissingCodeTimeout();
        setStatus("error");
        setStatusMessage(
          message.data.error_message ?? messages.signupIncomplete,
        );
        return;
      }

      if (
        handleSignupEvent?.(message.event, message, {
          setStatus,
          setStatusMessage,
        })
      ) {
        return;
      }

      if (isEmbeddedSignupFinishEvent(message.event)) {
        const signupData = mapFinishMessage(message);

        if (!signupData) {
          return;
        }

        signupDataRef.current = signupData;
        maybeSubmitSignup();
      }
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    clearMissingCodeTimeout,
    handleSignupEvent,
    mapFinishMessage,
    maybeSubmitSignup,
    messages.connectCancelled,
    messages.signupIncomplete,
  ]);

  useEffect(() => {
    if (!sdkReady || !config.isConfigured) {
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: config.appId,
        autoLogAppEvents: true,
        cookie: true,
        xfbml: true,
        version: config.graphApiVersion,
      });
    };

    if (window.FB) {
      window.fbAsyncInit?.();
    }
  }, [config.appId, config.graphApiVersion, config.isConfigured, sdkReady]);

  useEffect(() => {
    return () => {
      clearMissingCodeTimeout();
    };
  }, [clearMissingCodeTimeout]);

  const launchEmbeddedSignup = useCallback(() => {
    if (!config.isConfigured || !window.FB) {
      return;
    }

    clearMissingCodeTimeout();
    setStatus("waiting");
    setStatusMessage(messages.connectWaiting);
    authCodeRef.current = null;
    signupDataRef.current = null;

    window.FB.login(handleFbLoginResponse, {
      config_id: config.configId,
      response_type: "code",
      override_default_response_type: true,
      extras: EMBEDDED_SIGNUP_FB_LOGIN_EXTRAS,
    });
  }, [
    clearMissingCodeTimeout,
    config.configId,
    config.isConfigured,
    handleFbLoginResponse,
    messages.connectWaiting,
  ]);

  return {
    sdkReady,
    setSdkReady,
    status,
    statusMessage,
    launchEmbeddedSignup,
    isFinishing: status === "finishing",
  };
}
