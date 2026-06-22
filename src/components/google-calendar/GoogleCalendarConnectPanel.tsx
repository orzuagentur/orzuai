"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { GoogleCalendarIcon } from "@/components/icons/channel-brand-icons";
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
import { disconnectGoogleCalendarAction } from "@/features/google-calendar/actions/disconnect";
import {
  GOOGLE_CALENDAR_INTEGRATION_HREF,
  GOOGLE_CALENDAR_MESSAGES,
} from "@/features/google-calendar/constants";
import type {
  GoogleCalendarConnectConfig,
  GoogleCalendarConnectionData,
} from "@/types/google-calendar.types";

type GoogleCalendarConnectPanelProps = {
  connection: GoogleCalendarConnectionData | null;
  hasBusiness: boolean;
  config: GoogleCalendarConnectConfig;
  embeddedInHub?: boolean;
};

export function GoogleCalendarConnectPanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: GoogleCalendarConnectPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast.success(GOOGLE_CALENDAR_MESSAGES.oauthSuccess);
      router.replace(GOOGLE_CALENDAR_INTEGRATION_HREF);
    } else if (searchParams.get("error")) {
      toast.error(GOOGLE_CALENDAR_MESSAGES.oauthError);
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
          <CardTitle>{GOOGLE_CALENDAR_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {GOOGLE_CALENDAR_MESSAGES.noBusinessDescription}
          </CardDescription>
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
          <CardTitle>{GOOGLE_CALENDAR_MESSAGES.notConfiguredTitle}</CardTitle>
          <CardDescription>
            {GOOGLE_CALENDAR_MESSAGES.notConfiguredDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-3 px-0 pb-0" : "space-y-3"}>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{GOOGLE_CALENDAR_MESSAGES.redirectUriLabel}</p>
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
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                  <GoogleCalendarIcon className="size-5" />
                </div>
                <div>
                  <CardTitle>{GOOGLE_CALENDAR_MESSAGES.connectTitle}</CardTitle>
                  <CardDescription>
                    {GOOGLE_CALENDAR_MESSAGES.connectDescription}
                  </CardDescription>
                </div>
              </div>
              <Badge>connected</Badge>
            </div>
          </CardHeader>
          <CardContent className={contentClassName}>
            <div className="rounded-lg border p-4 text-sm">
              {connection.googleAccountEmail ? (
                <p>
                  <span className="text-muted-foreground">
                    {GOOGLE_CALENDAR_MESSAGES.connectedAs}:{" "}
                  </span>
                  {connection.googleAccountEmail}
                </p>
              ) : null}
              {connection.calendarSummary ? (
                <p className="mt-2">
                  <span className="text-muted-foreground">
                    {GOOGLE_CALENDAR_MESSAGES.calendarLabel}:{" "}
                  </span>
                  {connection.calendarSummary}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={DASHBOARD_ROUTES.calendar}>
                  <GoogleCalendarIcon className="size-5" />
                  Open Calendar
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={config.connectUrl}>
                  <ExternalLinkIcon className="size-4" />
                  {GOOGLE_CALENDAR_MESSAGES.reconnectButton}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <IntegrationDangerZone
          resourceLabel="Google Calendar"
          onDisconnect={disconnectGoogleCalendarAction}
          successMessage={GOOGLE_CALENDAR_MESSAGES.disconnectSuccess}
        />
      </div>
    );
  }

  return (
    <Card className={embeddedInHub ? cardClassName : "mx-auto max-w-2xl shadow-none"}>
      <CardHeader className={headerClassName}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
            <GoogleCalendarIcon className="size-5" />
          </div>
          <div>
            <CardTitle>{GOOGLE_CALENDAR_MESSAGES.connectTitle}</CardTitle>
            <CardDescription>
              {GOOGLE_CALENDAR_MESSAGES.connectDescription}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>
        <Button asChild size="lg">
          <a href={config.connectUrl}>
            <GoogleCalendarIcon className="size-5" />
            {GOOGLE_CALENDAR_MESSAGES.connectButton}
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Calendar will appear in the left navigation after connecting.
        </p>
      </CardContent>
    </Card>
  );
}
