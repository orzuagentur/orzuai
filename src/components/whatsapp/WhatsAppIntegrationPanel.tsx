"use client";

import Link from "next/link";

import { WhatsAppEmbeddedSignup } from "@/components/whatsapp/WhatsAppEmbeddedSignup";
import { IntegrationQuickLinks } from "@/components/integrations/IntegrationQuickLinks";
import {
  IntegrationWebhookHealth,
  resolveWebhookHealthStatus,
} from "@/components/integrations/IntegrationWebhookHealth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import type {
  WhatsAppEmbeddedSignupConfig,
  WhatsAppConnectionData,
} from "@/types/whatsapp.types";

type WhatsAppIntegrationPanelProps = {
  connection: WhatsAppConnectionData | null;
  hasBusiness: boolean;
  embeddedSignupConfig: WhatsAppEmbeddedSignupConfig;
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
  embeddedSignupConfig,
  embeddedInHub = false,
}: WhatsAppIntegrationPanelProps) {
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

        {embeddedInHub ? <IntegrationQuickLinks channel="whatsapp" /> : null}
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
          {WHATSAPP_MESSAGES.requirementMeta}
        </li>
        <li className="flex gap-2">
          <span className="text-foreground/40">•</span>
          {WHATSAPP_MESSAGES.requirementPhone}
        </li>
      </ul>

      <WhatsAppEmbeddedSignup config={embeddedSignupConfig} />
    </div>
  );
}
