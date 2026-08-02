"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2Icon, MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useConnectManualWhatsApp } from "@/hooks/use-connect-manual-whatsapp";
import type { WhatsAppConnectConfig } from "@/types/whatsapp.types";

type WhatsAppConnectPanelProps = {
  config: WhatsAppConnectConfig;
  onConnected?: () => void;
};

export function WhatsAppConnectPanel({
  config,
  onConnected,
}: WhatsAppConnectPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");

  const { connect, isLoading } = useConnectManualWhatsApp({
    onSuccess: onConnected,
  });

  const canSubmit =
    config.isConfigured && apiKey.trim() && phoneNumberId.trim();
  const isSandbox = config.apiMode === "sandbox";
  const apiKeyHint = isSandbox
    ? WHATSAPP_MESSAGES.sandboxApiKeyHint
    : WHATSAPP_MESSAGES.apiKeyHint;
  const phoneNumberIdHint = isSandbox
    ? WHATSAPP_MESSAGES.sandboxPhoneNumberIdHint
    : WHATSAPP_MESSAGES.phoneNumberIdHint;

  async function handleConnect() {
    if (!canSubmit) {
      return;
    }

    await connect({
      apiKey: apiKey.trim(),
      phoneNumberId: phoneNumberId.trim(),
      displayPhoneNumber: displayPhoneNumber.trim() || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">{WHATSAPP_MESSAGES.requirementsTitle}</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {WHATSAPP_MESSAGES.requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {config.webhookUrl ? (
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p>
            <span className="font-medium">{WHATSAPP_MESSAGES.webhookUrlLabel}:</span>
          </p>
          <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
            {config.webhookUrl}
          </code>
        </div>
      ) : (
        <p className="text-sm text-destructive">{WHATSAPP_MESSAGES.notConfigured}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="whatsapp-api-key">{WHATSAPP_MESSAGES.apiKeyLabel}</Label>
        <Input
          id="whatsapp-api-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={WHATSAPP_MESSAGES.apiKeyPlaceholder}
        />
        <p className="text-xs text-muted-foreground">{apiKeyHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-phone-number-id">
          {WHATSAPP_MESSAGES.phoneNumberIdLabel}
        </Label>
        <Input
          id="whatsapp-phone-number-id"
          value={phoneNumberId}
          onChange={(event) => setPhoneNumberId(event.target.value)}
          placeholder={WHATSAPP_MESSAGES.phoneNumberIdPlaceholder}
        />
        <p className="text-xs text-muted-foreground">{phoneNumberIdHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-display-phone">
          {WHATSAPP_MESSAGES.displayPhoneLabel}
        </Label>
        <Input
          id="whatsapp-display-phone"
          value={displayPhoneNumber}
          onChange={(event) => setDisplayPhoneNumber(event.target.value)}
          placeholder={WHATSAPP_MESSAGES.displayPhonePlaceholder}
        />
        <p className="text-xs text-muted-foreground">
          {WHATSAPP_MESSAGES.displayPhoneHint}
        </p>
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={!canSubmit || isLoading}
        onClick={() => {
          void handleConnect();
        }}
      >
        {isLoading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <MessageCircleIcon className="size-4" />
        )}
        {isLoading ? WHATSAPP_MESSAGES.connectWaiting : WHATSAPP_MESSAGES.connectButton}
      </Button>

      <p className="text-xs text-muted-foreground">
        No Cloud API access?{" "}
        <Link
          href={`${DASHBOARD_ROUTES.integrations}/whatsapp-web`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Connect your personal WhatsApp via QR
        </Link>
        .
      </p>
    </div>
  );
}
