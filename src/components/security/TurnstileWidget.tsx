"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget (explicit render).
 *
 * Renders nothing when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is not set, so public
 * forms keep working until Turnstile is enabled via env. Emits the token via
 * `onToken` (or `null` on expiry/error).
 */
type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "auto" | "light" | "dark";
      size?: "normal" | "flexible" | "compact";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __orzuTurnstileLoading?: Promise<void>;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__orzuTurnstileLoading) {
    return window.__orzuTurnstileLoading;
  }

  window.__orzuTurnstileLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile script failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("turnstile script failed")));
    document.head.appendChild(script);
  });

  return window.__orzuTurnstileLoading;
}

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  className?: string;
  theme?: "auto" | "light" | "dark";
  /** Increment to force a widget reset (Turnstile tokens are single-use). */
  resetKey?: number;
};

export function TurnstileWidget({
  onToken,
  className,
  theme = "auto",
  resetKey = 0,
}: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (resetKey <= 0) {
      return;
    }

    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenRef.current(null);
    }
  }, [resetKey]);

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) {
          return;
        }

        // Avoid double render (e.g. React strict mode).
        if (widgetIdRef.current) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        // Network/script failure — leave token null; server decides policy.
        onTokenRef.current(null);
      });

    return () => {
      cancelled = true;

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}
