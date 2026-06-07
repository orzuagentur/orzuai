"use client";

import Link from "next/link";

import { InstagramEmbeddedSignup } from "@/components/instagram/InstagramEmbeddedSignup";
import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { disconnectInstagramAction } from "@/features/instagram/actions/disconnect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import type {
  InstagramConnectionData,
  InstagramEmbeddedSignupConfig,
} from "@/types/instagram.types";

type InstagramActivatePanelProps = {
  connection: InstagramConnectionData | null;
  hasBusiness: boolean;
  embeddedSignupConfig: InstagramEmbeddedSignupConfig;
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

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function InstagramActivatePanel({
  connection,
  hasBusiness,
  embeddedSignupConfig,
  embeddedInHub: _embeddedInHub = false,
}: InstagramActivatePanelProps) {
  if (!hasBusiness) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{INSTAGRAM_MESSAGES.noBusinessTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {INSTAGRAM_MESSAGES.noBusinessDescription}
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
            <h2 className="text-lg font-semibold">{INSTAGRAM_MESSAGES.connectTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {INSTAGRAM_MESSAGES.connectedHint}
            </p>
          </div>
          <Badge variant={getStatusVariant(connection.status)}>Connected</Badge>
        </div>

        <dl className="grid gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{INSTAGRAM_MESSAGES.connectedAccount}</dt>
            <dd className="mt-1 font-medium">
              @{connection.username || "—"}
            </dd>
          </div>
          {connection.connectedAt ? (
            <div>
              <dt className="text-muted-foreground">{INSTAGRAM_MESSAGES.connectedAt}</dt>
              <dd className="mt-1 font-medium">{formatDate(connection.connectedAt)}</dd>
            </div>
          ) : null}
        </dl>

        <IntegrationDangerZone
          resourceLabel={`@${connection.username || "instagram"}`}
          onDisconnect={disconnectInstagramAction}
          successMessage={INSTAGRAM_MESSAGES.disconnectSuccess}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{INSTAGRAM_MESSAGES.connectTitle}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {INSTAGRAM_MESSAGES.connectDescription}
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="text-foreground/40">•</span>
          {INSTAGRAM_MESSAGES.requirementProfessional}
        </li>
        <li className="flex gap-2">
          <span className="text-foreground/40">•</span>
          {INSTAGRAM_MESSAGES.requirementFacebookPage}
        </li>
      </ul>

      <InstagramEmbeddedSignup config={embeddedSignupConfig} />
    </div>
  );
}
