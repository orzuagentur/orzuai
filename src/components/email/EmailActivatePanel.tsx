"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { GmailIcon } from "@/components/icons/channel-brand-icons";
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
import { disconnectGmailAction } from "@/features/email/actions/disconnect";
import { EMAIL_INTEGRATION_HREF, EMAIL_MESSAGES } from "@/features/email/constants";
import type {
  GmailConnectConfig,
  GmailConnectionData,
} from "@/types/gmail-integration.types";

type EmailActivatePanelProps = {
  connection: GmailConnectionData | null;
  hasBusiness: boolean;
  config: GmailConnectConfig;
  embeddedInHub?: boolean;
};

export function EmailActivatePanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: EmailActivatePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast.success(EMAIL_MESSAGES.oauthSuccess);
      router.replace(EMAIL_INTEGRATION_HREF);
    } else if (searchParams.get("error")) {
      toast.error(EMAIL_MESSAGES.oauthError);
    }
  }, [router, searchParams]);

  const cardClassName = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-2xl shadow-none";
  const headerClassName = embeddedInHub ? "px-0 pt-0" : undefined;
  const contentClassName = embeddedInHub ? "space-y-4 px-0 pb-0" : "space-y-4";

  if (!hasBusiness) {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle>{EMAIL_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>{EMAIL_MESSAGES.noBusinessDescription}</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!config.isConfigured) {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle>{EMAIL_MESSAGES.notConfiguredTitle}</CardTitle>
          <CardDescription>{EMAIL_MESSAGES.notConfiguredDescription}</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-3 px-0 pb-0" : "space-y-3"}>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{EMAIL_MESSAGES.redirectUriLabel}</p>
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
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
                  <GmailIcon className="size-5" />
                </div>
                <div>
                  <CardTitle>{EMAIL_MESSAGES.connectTitle}</CardTitle>
                  <CardDescription>{EMAIL_MESSAGES.connectDescription}</CardDescription>
                </div>
              </div>
              <Badge>connected</Badge>
            </div>
          </CardHeader>
          <CardContent className={contentClassName}>
            {connection.gmailAddress ? (
              <div className="rounded-lg border p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">
                    {EMAIL_MESSAGES.connectedAs}:{" "}
                  </span>
                  {connection.gmailAddress}
                </p>
                <p className="mt-2 text-muted-foreground">{EMAIL_MESSAGES.syncHint}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`${DASHBOARD_ROUTES.chats}/email`}>
                  <GmailIcon className="size-5" />
                  {EMAIL_MESSAGES.openInbox}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={config.connectUrl}>
                  <ExternalLinkIcon className="size-4" />
                  {EMAIL_MESSAGES.reconnectButton}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <IntegrationDangerZone
          resourceLabel="Gmail"
          onDisconnect={disconnectGmailAction}
          successMessage={EMAIL_MESSAGES.disconnectSuccess}
        />
      </div>
    );
  }

  return (
    <Card className={embeddedInHub ? cardClassName : "mx-auto max-w-2xl shadow-none"}>
      <CardHeader className={headerClassName}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40">
            <GmailIcon className="size-5" />
          </div>
          <div>
            <CardTitle>{EMAIL_MESSAGES.connectTitle}</CardTitle>
            <CardDescription>{EMAIL_MESSAGES.connectDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>
        <Button asChild size="lg">
          <a href={config.connectUrl}>
            <GmailIcon className="size-5" />
            {EMAIL_MESSAGES.connectButton}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">{EMAIL_MESSAGES.syncHint}</p>
      </CardContent>
    </Card>
  );
}
