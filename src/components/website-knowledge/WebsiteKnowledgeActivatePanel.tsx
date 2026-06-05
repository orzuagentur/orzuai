"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpenIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  disconnectWebsiteKnowledgeAction,
  saveWebsiteKnowledgeSetupAction,
  syncWebsiteKnowledgeNowAction,
  updateWebsiteKnowledgeSettingsAction,
  WEBSITE_KNOWLEDGE_MESSAGES,
} from "@/features/website-knowledge";
import { WEBSITE_KNOWLEDGE_SYNC_INTERVALS } from "@/types/website-knowledge.types";
import type { WebsiteKnowledgeSyncData } from "@/types/website-knowledge.types";

type WebsiteKnowledgeActivatePanelProps = {
  sync: WebsiteKnowledgeSyncData | null;
  hasBusiness: boolean;
  geminiConfigured: boolean;
  embeddedInHub?: boolean;
  showKnowledgeBaseLink?: boolean;
};

function statusBadge(sync: WebsiteKnowledgeSyncData | null) {
  if (!sync) {
    return <Badge variant="outline">not set up</Badge>;
  }

  if (sync.syncStatus === "syncing") {
    return <Badge variant="secondary">{WEBSITE_KNOWLEDGE_MESSAGES.statusSyncing}</Badge>;
  }

  if (sync.syncStatus === "ready") {
    return <Badge>{WEBSITE_KNOWLEDGE_MESSAGES.statusReady}</Badge>;
  }

  if (sync.syncStatus === "error") {
    return <Badge variant="destructive">{WEBSITE_KNOWLEDGE_MESSAGES.statusError}</Badge>;
  }

  return <Badge variant="outline">{WEBSITE_KNOWLEDGE_MESSAGES.statusIdle}</Badge>;
}

export function WebsiteKnowledgeActivatePanel({
  sync,
  hasBusiness,
  geminiConfigured,
  embeddedInHub = false,
  showKnowledgeBaseLink = true,
}: WebsiteKnowledgeActivatePanelProps) {
  const router = useRouter();
  const [siteUrl, setSiteUrl] = useState(sync?.siteUrl ?? "");
  const [autoSync, setAutoSync] = useState(sync?.autoSyncEnabled ?? true);
  const [intervalHours, setIntervalHours] = useState(
    String(sync?.syncIntervalHours ?? 168),
  );
  const [busy, setBusy] = useState(false);

  const cardClass = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-3xl shadow-none";

  async function handleSaveAndSync() {
    setBusy(true);

    try {
      const result = await saveWebsiteKnowledgeSetupAction({
        siteUrl,
        autoSyncEnabled: autoSync,
        syncIntervalHours: Number(intervalHours),
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(WEBSITE_KNOWLEDGE_MESSAGES.syncSuccess);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setBusy(true);

    try {
      const result = await syncWebsiteKnowledgeNowAction();

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(
        `${WEBSITE_KNOWLEDGE_MESSAGES.syncSuccess} (${result.data.pagesIndexed} pages, ${result.data.entriesSynced} entries)`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSettings() {
    setBusy(true);

    try {
      const result = await updateWebsiteKnowledgeSettingsAction({
        siteUrl,
        autoSyncEnabled: autoSync,
        syncIntervalHours: Number(intervalHours),
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(WEBSITE_KNOWLEDGE_MESSAGES.settingsSaved);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{WEBSITE_KNOWLEDGE_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {WEBSITE_KNOWLEDGE_MESSAGES.noBusinessDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!geminiConfigured) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle>{WEBSITE_KNOWLEDGE_MESSAGES.connectTitle}</CardTitle>
          <CardDescription>{WEBSITE_KNOWLEDGE_MESSAGES.geminiRequired}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="size-5 text-primary" />
              <CardTitle>{WEBSITE_KNOWLEDGE_MESSAGES.connectTitle}</CardTitle>
            </div>
            {statusBadge(sync)}
          </div>
          <CardDescription>{WEBSITE_KNOWLEDGE_MESSAGES.connectDescription}</CardDescription>
        </CardHeader>
        <CardContent
          className={embeddedInHub ? "space-y-5 px-0 pb-0" : "space-y-5"}
        >
          <div className="space-y-2">
            <Label htmlFor="site-url">{WEBSITE_KNOWLEDGE_MESSAGES.siteUrlLabel}</Label>
            <Input
              id="site-url"
              value={siteUrl}
              onChange={(event) => setSiteUrl(event.target.value)}
              placeholder={WEBSITE_KNOWLEDGE_MESSAGES.siteUrlPlaceholder}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={autoSync}
              onChange={(event) => setAutoSync(event.target.checked)}
            />
            <span>
              <span className="font-medium">
                {WEBSITE_KNOWLEDGE_MESSAGES.autoSyncLabel}
              </span>
              <span className="block text-sm text-muted-foreground">
                {WEBSITE_KNOWLEDGE_MESSAGES.autoSyncHint}
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="sync-interval">{WEBSITE_KNOWLEDGE_MESSAGES.intervalLabel}</Label>
            <select
              id="sync-interval"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={intervalHours}
              onChange={(event) => setIntervalHours(event.target.value)}
            >
              {WEBSITE_KNOWLEDGE_SYNC_INTERVALS.map((option) => (
                <option key={option.hours} value={option.hours}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-muted-foreground">
            {WEBSITE_KNOWLEDGE_MESSAGES.aiUsageNote}
          </p>

          <div className="flex flex-wrap gap-2">
            {!sync ? (
              <Button type="button" disabled={busy || !siteUrl.trim()} onClick={handleSaveAndSync}>
                {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {WEBSITE_KNOWLEDGE_MESSAGES.saveAndSync}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={busy || sync.syncStatus === "syncing"}
                  onClick={handleSyncNow}
                >
                  {busy ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="size-4" />
                  )}
                  {WEBSITE_KNOWLEDGE_MESSAGES.syncNow}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={handleSaveSettings}
                >
                  {WEBSITE_KNOWLEDGE_MESSAGES.saveSettings}
                </Button>
              </>
            )}
            {sync ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={async () => {
                  await disconnectWebsiteKnowledgeAction();
                  toast.success(WEBSITE_KNOWLEDGE_MESSAGES.disconnectSuccess);
                  router.refresh();
                }}
              >
                {WEBSITE_KNOWLEDGE_MESSAGES.disconnect}
              </Button>
            ) : null}
          </div>

          {sync ? (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  {WEBSITE_KNOWLEDGE_MESSAGES.lastSynced}:
                </span>{" "}
                {sync.lastSyncedAt
                  ? new Date(sync.lastSyncedAt).toLocaleString()
                  : WEBSITE_KNOWLEDGE_MESSAGES.never}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  {WEBSITE_KNOWLEDGE_MESSAGES.nextSync}:
                </span>{" "}
                {sync.nextSyncAt && sync.autoSyncEnabled
                  ? new Date(sync.nextSyncAt).toLocaleString()
                  : WEBSITE_KNOWLEDGE_MESSAGES.never}
              </p>
              <p>
                {WEBSITE_KNOWLEDGE_MESSAGES.pagesIndexed}: {sync.pagesIndexed} ·{" "}
                {WEBSITE_KNOWLEDGE_MESSAGES.entriesSynced}: {sync.entriesSynced}
              </p>
              {sync.lastSyncError ? (
                <p className="mt-2 text-destructive">{sync.lastSyncError}</p>
              ) : null}
            </div>
          ) : null}

          {showKnowledgeBaseLink ? (
            <Button asChild variant="outline">
              <Link href={DASHBOARD_ROUTES.knowledgeBase}>
                {WEBSITE_KNOWLEDGE_MESSAGES.openKnowledgeBase}
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
