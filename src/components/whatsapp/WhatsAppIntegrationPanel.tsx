"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { WhatsAppManualConnect } from "@/components/whatsapp/WhatsAppManualConnect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IntegrationQuickLinks } from "@/components/integrations/IntegrationQuickLinks";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  WhatsAppConnectConfig,
  WhatsAppConnectionData,
} from "@/types/whatsapp.types";

type WhatsAppIntegrationPanelProps = {
  connection: WhatsAppConnectionData | null;
  hasBusiness: boolean;
  connectConfig: WhatsAppConnectConfig;
  /** When true, panel is shown inside the integrations hub (no outer page title). */
  embeddedInHub?: boolean;
};

function getStatusVariant(
  status: WhatsAppConnectionData["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function WhatsAppIntegrationPanel({
  connection,
  hasBusiness,
  connectConfig,
  embeddedInHub = false,
}: WhatsAppIntegrationPanelProps) {
  const router = useRouter();

  if (!hasBusiness) {
    return (
      <Card className="mx-auto max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{WHATSAPP_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {WHATSAPP_MESSAGES.noBusinessDescription}
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
    ? "w-full max-w-none shadow-none border-0 bg-transparent"
    : "mx-auto w-full max-w-3xl shadow-none";

  return (
    <Card className={cardClassName}>
      <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{WHATSAPP_MESSAGES.connectTitle}</CardTitle>
            <CardDescription>
              {WHATSAPP_MESSAGES.connectDescription}
            </CardDescription>
          </div>
          {connection ? (
            <Badge variant={getStatusVariant(connection.status)}>
              {connection.status}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={embeddedInHub ? "space-y-6 px-0 pb-0" : "space-y-6"}>
        {connection?.status === "connected" ? (
          <div className="space-y-4">
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Connected number:</span>{" "}
                  {connection.phoneNumber}
                </p>
                {connection.connectedAt ? (
                  <p>
                    <span className="font-medium">Connected:</span>{" "}
                    {new Date(connection.connectedAt).toLocaleString("en-US")}
                  </p>
                ) : null}
                {connection.lastSyncedAt ? (
                  <p>
                    <span className="font-medium">Last activity:</span>{" "}
                    {new Date(connection.lastSyncedAt).toLocaleString("en-US")}
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  New messages arrive automatically via Meta webhooks.
                </p>
              </div>
            </div>
            {embeddedInHub ? (
              <IntegrationQuickLinks channel="whatsapp" />
            ) : null}
          </div>
        ) : (
          <WhatsAppManualConnect
            config={connectConfig}
            onConnected={() => router.refresh()}
          />
        )}
      </CardContent>
    </Card>
  );
}
