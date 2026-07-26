"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const DISMISS_KEY = "orzuai-pwa-install-dismissed";

export function PwaRegister() {
  const t = useTranslations("studio.pwa");
  const tCommon = useTranslations("common");
  const [canInstall, setCanInstall] = useState(false);
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {});

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e);
      setCanInstall(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed || !canInstall || !deferred) return null;

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[80] flex items-center gap-0.5 rounded-full border border-[color:rgba(232,165,75,0.45)] bg-[#121212]/95 p-1 pl-1.5 shadow-lg backdrop-blur lg:bottom-4 lg:right-4">
      <button
        type="button"
        className="rounded-full px-3 py-2 text-sm font-semibold text-[color:var(--accent)]"
        onClick={async () => {
          const ev = deferred as Event & {
            prompt: () => Promise<void>;
            userChoice: Promise<{ outcome: string }>;
          };
          await ev.prompt();
          const choice = await ev.userChoice;
          setCanInstall(false);
          setDeferred(null);
          if (choice.outcome === "accepted") {
            dismiss();
          }
        }}
      >
        {t("install")}
      </button>
      <button
        type="button"
        aria-label={tCommon("close")}
        title={tCommon("close")}
        onClick={dismiss}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-white/10 hover:text-[color:var(--fg)]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}
