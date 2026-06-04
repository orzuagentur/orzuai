"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { InstagramManualConnect } from "@/components/instagram/InstagramManualConnect";
import { IntegrationQuickLinks } from "@/components/integrations/IntegrationQuickLinks";
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
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import type {
  InstagramConnectConfig,
  InstagramConnectionData,
} from "@/types/instagram.types";

type InstagramActivatePanelProps = {
  connection: InstagramConnectionData | null;
  hasBusiness: boolean;
  connectConfig: InstagramConnectConfig;
  embeddedInHub?: boolean;
};

function getStatusVariant(
  status: InstagramConnectionData["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function InstagramActivatePanel({
  connection,
  hasBusiness,
  connectConfig,
  embeddedInHub = false,
}: InstagramActivatePanelProps) {
  const router = useRouter();

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{INSTAGRAM_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {INSTAGRAM_MESSAGES.noBusinessDescription}
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

  const cardClassName = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-2xl shadow-none";

  if (connection?.status === "connected") {
    return (
      <Card className={cardClassName}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{INSTAGRAM_MESSAGES.connectTitle}</CardTitle>
            <Badge variant={getStatusVariant(connection.status)}>connected</Badge>
          </div>
        </CardHeader>
        <CardContent
          className={embeddedInHub ? "space-y-4 px-0 pb-0" : "space-y-4"}
        >
          <div className="rounded-lg border p-4 text-sm">
            <p>
              <span className="font-medium">Instagram:</span> @
              {connection.username || "—"}
            </p>
            {connection.connectedAt ? (
              <p className="mt-1 text-muted-foreground">
                Connected {new Date(connection.connectedAt).toLocaleString("en-US")}
              </p>
            ) : null}
          </div>
          {embeddedInHub ? (
            <IntegrationQuickLinks channel="instagram" showHubSections />
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
        <div className="flex items-start gap-3">
          <Camera className="mt-1 size-5 text-primary" />
          <div className="space-y-1">
            <CardTitle>{INSTAGRAM_MESSAGES.connectTitle}</CardTitle>
            <CardDescription>{INSTAGRAM_MESSAGES.connectDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
        <InstagramManualConnect
          config={connectConfig}
          onConnected={() => router.refresh()}
        />
      </CardContent>
    </Card>
  );
}
