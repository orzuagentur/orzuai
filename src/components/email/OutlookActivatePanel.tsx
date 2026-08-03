"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLinkIcon, Loader2Icon, MailIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { disconnectOutlookAction } from "@/features/email/actions/outlook-disconnect";
import { syncOutlookNowAction } from "@/features/email/actions/outlook-sync-now";
import {
  OUTLOOK_INTEGRATION_HREF,
  OUTLOOK_MESSAGES,
} from "@/features/email/outlook-constants";
import { clearConversationDetailCache } from "@/lib/client-cache/inbox-messenger-cache";
import type {
  OutlookConnectConfig,
  OutlookConnectionData,
} from "@/types/outlook-integration.types";

type OutlookActivatePanelProps = {
  connection: OutlookConnectionData | null;
  hasBusiness: boolean;
  config: OutlookConnectConfig;
  embeddedInHub?: boolean;
};

export function OutlookActivatePanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: OutlookActivatePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get("outlook_connected") === "1") {
      clearConversationDetailCache();
      toast.success(OUTLOOK_MESSAGES.oauthSuccess);
      router.replace(OUTLOOK_INTEGRATION_HREF);
    } else if (searchParams.get("outlook_error")) {
      toast.error(OUTLOOK_MESSAGES.oauthError);
    }
  }, [router, searchParams]);

  const cardClassName = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-2xl shadow-none";
  const headerClassName = embeddedInHub ? "px-0 pt-0" : undefined;
  const contentClassName = embeddedInHub ? "space-y-4 px-0 pb-0" : "space-y-4";

  if (!hasBusiness) {
    return null;
  }

  if (!config.isConfigured) {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle>{OUTLOOK_MESSAGES.notConfiguredTitle}</CardTitle>
          <CardDescription>
            {OUTLOOK_MESSAGES.notConfiguredDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-3 px-0 pb-0" : "space-y-3"}>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{OUTLOOK_MESSAGES.redirectUriLabel}</p>
            <code className="mt-1 block break-all text-xs">{config.redirectUri}</code>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (connection?.status === "connected") {
    return (
      <div
        className={
          embeddedInHub
            ? "flex w-full flex-col gap-6"
            : "mx-auto flex w-full max-w-2xl flex-col gap-6"
        }
      >
        <Card className={cardClassName}>
          <CardHeader className={headerClassName}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
                  <MailIcon className="size-5 text-sky-700 dark:text-sky-300" />
                </div>
                <div>
                  <CardTitle>{OUTLOOK_MESSAGES.connectTitle}</CardTitle>
                  <CardDescription>
                    {OUTLOOK_MESSAGES.connectDescription}
                  </CardDescription>
                </div>
              </div>
              <Badge>connected</Badge>
            </div>
          </CardHeader>
          <CardContent className={contentClassName}>
            {connection.outlookAddress ? (
              <div className="rounded-lg border p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">
                    {OUTLOOK_MESSAGES.connectedAs}:{" "}
                  </span>
                  {connection.outlookAddress}
                </p>
                <p className="mt-2 text-muted-foreground">
                  {OUTLOOK_MESSAGES.syncHint}
                </p>
                {connection.lastSyncedAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {OUTLOOK_MESSAGES.lastSynced}:{" "}
                    {new Date(connection.lastSyncedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`${DASHBOARD_ROUTES.chats}/email`}>
                  <MailIcon className="size-4" />
                  Open Chats
                </Link>
              </Button>
              <Button
                variant="outline"
                disabled={isSyncing}
                onClick={() => {
                  void (async () => {
                    setIsSyncing(true);
                    try {
                      const result = await syncOutlookNowAction();
                      if (result.success) {
                        toast.success(result.message);
                        router.refresh();
                      } else {
                        toast.error(result.message);
                      }
                    } finally {
                      setIsSyncing(false);
                    }
                  })();
                }}
              >
                {isSyncing ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="size-4" />
                )}
                {OUTLOOK_MESSAGES.syncNow}
              </Button>
              <Button variant="outline" asChild>
                <a href={config.connectUrl}>
                  <ExternalLinkIcon className="size-4" />
                  {OUTLOOK_MESSAGES.reconnectButton}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <IntegrationDangerZone
          resourceLabel="Outlook"
          onDisconnect={disconnectOutlookAction}
          successMessage={OUTLOOK_MESSAGES.disconnectSuccess}
        />
      </div>
    );
  }

  return (
    <Card className={embeddedInHub ? cardClassName : "mx-auto max-w-2xl shadow-none"}>
      <CardHeader className={headerClassName}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
            <MailIcon className="size-5 text-sky-700 dark:text-sky-300" />
          </div>
          <div>
            <CardTitle>{OUTLOOK_MESSAGES.connectTitle}</CardTitle>
            <CardDescription>{OUTLOOK_MESSAGES.connectDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>
        <Button asChild size="lg">
          <a href={config.connectUrl}>
            <MailIcon className="size-4" />
            {OUTLOOK_MESSAGES.connectButton}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">{OUTLOOK_MESSAGES.syncHint}</p>
      </CardContent>
    </Card>
  );
}
