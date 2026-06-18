"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { WhatsAppConnectPanel } from "@/components/whatsapp/WhatsAppConnectPanel";
import { WhatsAppEmbeddedConnect } from "@/components/whatsapp/WhatsAppEmbeddedConnect";
import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { disconnectWhatsAppAction } from "@/features/whatsapp/actions/disconnect";
import {
  IntegrationWebhookHealth,
  resolveWebhookHealthStatus,
} from "@/components/integrations/IntegrationWebhookHealth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  WhatsAppConnectionData,
  WhatsAppConnectConfig,
} from "@/types/whatsapp.types";

type WhatsAppIntegrationPanelProps = {
  connection: WhatsAppConnectionData | null;
  hasBusiness: boolean;
  connectConfig: WhatsAppConnectConfig;
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

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function WhatsAppIntegrationPanel({
  connection,
  hasBusiness,
  connectConfig,
  embeddedInHub: _embeddedInHub = false,
}: WhatsAppIntegrationPanelProps) {
  const router = useRouter();

  function handleConnected() {
    router.refresh();
  }

  if (!hasBusiness) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{WHATSAPP_MESSAGES.noBusinessTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {WHATSAPP_MESSAGES.noBusinessDescription}
          </p>
        </div>
        <Button asChild>
          <Link href={DASHBOARD_ROUTES.settings}>Business settings</Link>
        </Button>
      </div>
    );
  }

  if (connection?.status === "pending") {
    return (
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{WHATSAPP_MESSAGES.pendingTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {WHATSAPP_MESSAGES.pendingDescription}
            </p>
          </div>
          <Badge variant="secondary">Activating</Badge>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm">
          <Loader2Icon className="size-5 shrink-0 animate-spin text-muted-foreground" />
          <div>
            <p className="font-medium">{connection.phoneNumber}</p>
            <p className="text-muted-foreground">
              Waiting for 360dialog to mark the channel live.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (connection?.status === "connected") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{WHATSAPP_MESSAGES.connectTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {WHATSAPP_MESSAGES.connectedHint}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(connection.status)}>Connected</Badge>
            <IntegrationWebhookHealth
              status={resolveWebhookHealthStatus({
                connected: true,
                lastActivityAt: connection.lastSyncedAt,
              })}
            />
          </div>
        </div>

        <dl className="grid gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              {WHATSAPP_MESSAGES.connectedNumber}
            </dt>
            <dd className="mt-1 font-medium">{connection.phoneNumber}</dd>
          </div>
          {connection.connectedAt ? (
            <div>
              <dt className="text-muted-foreground">{WHATSAPP_MESSAGES.connectedAt}</dt>
              <dd className="mt-1 font-medium">{formatDate(connection.connectedAt)}</dd>
            </div>
          ) : null}
          {connection.lastSyncedAt ? (
            <div>
              <dt className="text-muted-foreground">{WHATSAPP_MESSAGES.lastActivity}</dt>
              <dd className="mt-1 font-medium">{formatDate(connection.lastSyncedAt)}</dd>
            </div>
          ) : null}
        </dl>

        <IntegrationDangerZone
          resourceLabel={connection.phoneNumber}
          onDisconnect={disconnectWhatsAppAction}
          successMessage={WHATSAPP_MESSAGES.disconnectSuccess}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{WHATSAPP_MESSAGES.connectTitle}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {WHATSAPP_MESSAGES.connectDescription}
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="text-foreground/40">•</span>
          {WHATSAPP_MESSAGES.requirementAccount}
        </li>
        <li className="flex gap-2">
          <span className="text-foreground/40">•</span>
          {WHATSAPP_MESSAGES.requirementApiKey}
        </li>
      </ul>

      {connectConfig.embeddedSignupEnabled ? (
        <WhatsAppEmbeddedConnect
          config={connectConfig}
          onConnected={handleConnected}
        />
      ) : null}

      {connectConfig.embeddedSignupEnabled ? (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {WHATSAPP_MESSAGES.manualConnectTitle}
            </span>
          </div>
        </div>
      ) : null}

      {connectConfig.embeddedSignupEnabled ? (
        <p className="text-sm text-muted-foreground">
          {WHATSAPP_MESSAGES.manualConnectDescription}
        </p>
      ) : null}

      <WhatsAppConnectPanel
        config={connectConfig}
        onConnected={handleConnected}
      />
    </div>
  );
}
