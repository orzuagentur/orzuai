"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GlobeIcon, Loader2Icon } from "lucide-react";

import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
import { WebsiteKnowledgeActivatePanel } from "@/components/website-knowledge/WebsiteKnowledgeActivatePanel";
import { DASHBOARD_ROUTES } from "@/constants/routes";
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
  const isSyncing = sync?.syncStatus === "syncing";

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/website-knowledge/status", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { sync: WebsiteKnowledgeSyncData | null };
      setSync(payload.sync);

      if (payload.sync?.syncStatus !== "syncing") {
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
            setSync((current) =>
              current ? { ...current, syncStatus: "syncing" } : current,
            );
            void pollStatus();
          }}
        />
      </div>

      {isSyncing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label="Website scan in progress"
        >
          <div className="mx-4 w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GlobeIcon className="size-7 animate-pulse" />
            </div>
            <Loader2Icon className="mx-auto mb-4 size-8 animate-spin text-primary" />
            <h2 className="text-lg font-semibold">Scanning your website</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crawling pages and extracting knowledge. You can leave this page — the scan
              continues in the background.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
