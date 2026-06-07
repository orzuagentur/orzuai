"use client";

import { useState } from "react";
import { Loader2Icon, MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useConnectManualWhatsApp } from "@/hooks/use-connect-manual-whatsapp";
import type { WhatsAppConnectConfig } from "@/types/whatsapp.types";

type WhatsAppManualConnectProps = {
  config: WhatsAppConnectConfig;
  onConnected?: () => void;
};

export function WhatsAppManualConnect({
  config,
  onConnected,
}: WhatsAppManualConnectProps) {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");

  const { connect, isLoading } = useConnectManualWhatsApp({
    onSuccess: onConnected,
  });

  const canSubmit =
    config.isConfigured &&
    phoneNumberId.trim() &&
    wabaId.trim() &&
    accessToken.trim();

  async function handleConnect() {
    if (!canSubmit) {
      return;
    }

    await connect({
      phoneNumberId: phoneNumberId.trim(),
      wabaId: wabaId.trim(),
      accessToken: accessToken.trim(),
      businessAccountId: businessAccountId.trim() || undefined,
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
          <p className="text-xs text-muted-foreground">
            {WHATSAPP_MESSAGES.verifyTokenLabel}: set in Meta Developer Console and match{" "}
            <code className="rounded bg-muted px-1">WHATSAPP_VERIFY_TOKEN</code> on Vercel.{" "}
            {WHATSAPP_MESSAGES.verifyTokenHint}
          </p>
        </div>
      ) : (
        <p className="text-sm text-destructive">{WHATSAPP_MESSAGES.notConfigured}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="whatsapp-phone-number-id">
          {WHATSAPP_MESSAGES.phoneNumberIdLabel}
        </Label>
        <Input
          id="whatsapp-phone-number-id"
          autoComplete="off"
          placeholder={WHATSAPP_MESSAGES.phoneNumberIdPlaceholder}
          value={phoneNumberId}
          onChange={(event) => setPhoneNumberId(event.target.value)}
          disabled={isLoading || !config.isConfigured}
        />
        <p className="text-xs text-muted-foreground">
          {WHATSAPP_MESSAGES.phoneNumberIdHint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-waba-id">{WHATSAPP_MESSAGES.wabaIdLabel}</Label>
        <Input
          id="whatsapp-waba-id"
          autoComplete="off"
          placeholder={WHATSAPP_MESSAGES.wabaIdPlaceholder}
          value={wabaId}
          onChange={(event) => setWabaId(event.target.value)}
          disabled={isLoading || !config.isConfigured}
        />
        <p className="text-xs text-muted-foreground">{WHATSAPP_MESSAGES.wabaIdHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-access-token">
          {WHATSAPP_MESSAGES.accessTokenLabel}
        </Label>
        <Input
          id="whatsapp-access-token"
          type="password"
          autoComplete="off"
          placeholder={WHATSAPP_MESSAGES.accessTokenPlaceholder}
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
          disabled={isLoading || !config.isConfigured}
        />
        <p className="text-xs text-muted-foreground">
          {WHATSAPP_MESSAGES.accessTokenHint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-business-account-id">
          {WHATSAPP_MESSAGES.businessAccountIdLabel}
        </Label>
        <Input
          id="whatsapp-business-account-id"
          autoComplete="off"
          placeholder={WHATSAPP_MESSAGES.businessAccountIdPlaceholder}
          value={businessAccountId}
          onChange={(event) => setBusinessAccountId(event.target.value)}
          disabled={isLoading || !config.isConfigured}
        />
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        disabled={isLoading || !canSubmit}
        onClick={() => {
          void handleConnect();
        }}
      >
        {isLoading ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            {WHATSAPP_MESSAGES.connectWaitingManual}
          </>
        ) : (
          <>
            <MessageCircleIcon className="size-4" />
            {WHATSAPP_MESSAGES.connectTitle}
          </>
        )}
      </Button>
    </div>
  );
}
