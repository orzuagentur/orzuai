"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GlobeIcon, Loader2Icon, Maximize2Icon, MinusIcon } from "lucide-react";

import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
import { Button } from "@/components/ui/button";
import { WebsiteKnowledgeActivatePanel } from "@/components/website-knowledge/WebsiteKnowledgeActivatePanel";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

type WebsiteKnowledgeScanPageProps = {
  sync: WebsiteKnowledgeSyncData | null;
  hasBusiness: boolean;
  geminiConfigured: boolean;
};

export function WebsiteKnowledgeScanPage({
  sync: initialSync,
  hasBusiness,
  geminiConfigured,
}: WebsiteKnowledgeScanPageProps) {
  const router = useRouter();
  const [sync, setSync] = useState(initialSync);
  const [overlayMinimized, setOverlayMinimized] = useState(false);
  const isSyncing = sync?.syncStatus === "syncing";

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/website-knowledge/status", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        sync: WebsiteKnowledgeSyncData | null;
      };
      setSync(payload.sync);

      if (payload.sync?.syncStatus !== "syncing") {
        setOverlayMinimized(false);
        router.refresh();
      }
    } catch {
      // Ignore transient network errors while polling.
    }
  }, [router]);

  useEffect(() => {
    setSync(initialSync);
  }, [initialSync]);

  useEffect(() => {
    if (!isSyncing) {
      setOverlayMinimized(false);
      return;
    }

    const interval = window.setInterval(() => {
      void pollStatus();
    }, 2000);

    void pollStatus();

    return () => {
      window.clearInterval(interval);
    };
  }, [isSyncing, pollStatus]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <AiAssistantPageHeader
        title="Website scanner"
        description="Crawl your public website and keep pricing, services, and FAQ in sync."
        backHref={DASHBOARD_ROUTES.aiAssistantKnowledge}
        backLabel="Knowledge base"
      />

      <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
        <WebsiteKnowledgeActivatePanel
          sync={sync}
          hasBusiness={hasBusiness}
          geminiConfigured={geminiConfigured}
          embeddedInHub
          showKnowledgeBaseLink={false}
          onSyncStarted={() => {
            setOverlayMinimized(false);
            setSync((current) =>
              current ? { ...current, syncStatus: "syncing" } : current,
            );
            void pollStatus();
          }}
        />
      </div>

      {isSyncing && !overlayMinimized ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label="Website scan in progress"
        >
          <div className="relative mx-4 w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 size-8"
              title="Hide — scan continues in background"
              aria-label="Hide scan overlay"
              onClick={() => setOverlayMinimized(true)}
            >
              <MinusIcon className="size-4" />
            </Button>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GlobeIcon className="size-7 animate-pulse" />
            </div>
            <Loader2Icon className="mx-auto mb-4 size-8 animate-spin text-primary" />
            <h2 className="text-lg font-semibold">Scanning your website</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crawling pages and extracting knowledge. Press{" "}
              <span className="font-medium text-foreground">_</span> to hide this
              card — the scan keeps running in the background.
            </p>
          </div>
        </div>
      ) : null}

      {isSyncing && overlayMinimized ? (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 w-[min(100%-2rem,20rem)] rounded-xl border bg-card p-3 shadow-lg",
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Loader2Icon className="size-4 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Scanning in background</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {sync?.siteUrl ?? "Website"}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              title="Show scan card"
              aria-label="Show scan card"
              onClick={() => setOverlayMinimized(false)}
            >
              <Maximize2Icon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
