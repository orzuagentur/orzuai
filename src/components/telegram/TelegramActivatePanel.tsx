"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, Send } from "lucide-react";

import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { disconnectTelegramAction } from "@/features/telegram/actions/disconnect";
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
import { TELEGRAM_MESSAGES } from "@/features/telegram/constants";
import { useConnectTelegram } from "@/hooks/use-connect-telegram";
import type {
  TelegramConnectConfig,
  TelegramConnectionData,
} from "@/types/telegram.types";

type TelegramActivatePanelProps = {
  connection: TelegramConnectionData | null;
  hasBusiness: boolean;
  config: TelegramConnectConfig;
  embeddedInHub?: boolean;
};

function getStatusVariant(
  status: TelegramConnectionData["status"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function TelegramActivatePanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: TelegramActivatePanelProps) {
  const router = useRouter();
  const [botToken, setBotToken] = useState("");
  const { connectBot, isLoading } = useConnectTelegram({
    onSuccess: () => {
      setBotToken("");
      router.refresh();
    },
  });

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{TELEGRAM_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {TELEGRAM_MESSAGES.noBusinessDescription}
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

  if (connection?.status === "connected") {
    return (
      <Card
        className={
          embeddedInHub
            ? "w-full max-w-none border-0 bg-transparent shadow-none"
            : "max-w-2xl shadow-none"
        }
      >
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{TELEGRAM_MESSAGES.connectTitle}</CardTitle>
            <Badge variant={getStatusVariant(connection.status)}>connected</Badge>
          </div>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-6 px-0 pb-0" : "space-y-6"}>
          <div className="rounded-lg border p-4 text-sm">
            <p>
              <span className="font-medium">Bot:</span> @
              {connection.botUsername || "—"}
            </p>
            {connection.connectedAt ? (
              <p className="mt-1 text-muted-foreground">
                Connected {new Date(connection.connectedAt).toLocaleString("en-US")}
              </p>
            ) : null}
          </div>
          <PersonalAccountLink />
          <IntegrationDangerZone
            resourceLabel={`@${connection.botUsername || "telegram bot"}`}
            onDisconnect={disconnectTelegramAction}
            successMessage={TELEGRAM_MESSAGES.disconnectSuccess}
          />
        </CardContent>
      </Card>
    );
  }

  const cardClassName = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-2xl shadow-none";

  async function handleConnect() {
    if (!botToken.trim() || !config.isConfigured) {
      return;
    }

    await connectBot({ botToken: botToken.trim() });
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
        <div className="flex items-start gap-3">
          <Send className="mt-1 size-5 text-primary" />
          <div className="space-y-1">
            <CardTitle>{TELEGRAM_MESSAGES.connectTitle}</CardTitle>
            <CardDescription>{TELEGRAM_MESSAGES.connectDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={embeddedInHub ? "space-y-5 px-0 pb-0" : "space-y-5"}
      >
        <RequirementsList />

        <div className="space-y-2">
          <Label htmlFor="telegram-bot-token">{TELEGRAM_MESSAGES.botTokenLabel}</Label>
          <Input
            id="telegram-bot-token"
            type="password"
            autoComplete="off"
            placeholder={TELEGRAM_MESSAGES.botTokenPlaceholder}
            value={botToken}
            onChange={(event) => setBotToken(event.target.value)}
            disabled={isLoading || !config.isConfigured}
          />
          <p className="text-xs text-muted-foreground">
            {TELEGRAM_MESSAGES.botTokenHint}
          </p>
        </div>

        {config.webhookBaseUrl ? (
          <p className="text-xs text-muted-foreground">
            Webhook URL:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              {config.webhookBaseUrl}
            </code>
          </p>
        ) : (
          <p className="text-sm text-destructive">{TELEGRAM_MESSAGES.notConfigured}</p>
        )}

        <Button
          type="button"
          size="lg"
          disabled={isLoading || !config.isConfigured || !botToken.trim()}
          onClick={() => {
            void handleConnect();
          }}
        >
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              {TELEGRAM_MESSAGES.connectWaiting}
            </>
          ) : (
            TELEGRAM_MESSAGES.connectButton
          )}
        </Button>

        <PersonalAccountLink />
      </CardContent>
    </Card>
  );
}

function PersonalAccountLink() {
  return (
    <p className="text-xs text-muted-foreground">
      Prefer using your own account?{" "}
      <Link
        href={`${DASHBOARD_ROUTES.integrations}/telegram-personal`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Connect a personal Telegram account
      </Link>
      .
    </p>
  );
}

function RequirementsList() {
  return (
    <div className="rounded-lg border bg-muted/20 p-4 text-sm">
      <p className="font-medium">{TELEGRAM_MESSAGES.requirementsTitle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>{TELEGRAM_MESSAGES.requirementBotFather}</li>
        <li>{TELEGRAM_MESSAGES.requirementHttps}</li>
        <li>{TELEGRAM_MESSAGES.requirementPrivacy}</li>
      </ul>
    </div>
  );
}
