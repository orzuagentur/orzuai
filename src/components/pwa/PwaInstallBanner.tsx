"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!deferredPrompt || dismissed) {
    return null;
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <DownloadIcon className="size-4" />
        <span>Install OrzuAI on your device for quick access.</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={handleInstall}>
          Install app
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setDismissed(true)}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
