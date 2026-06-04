"use client";

import { useState } from "react";
import { Camera, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import { useConnectManualInstagram } from "@/hooks/use-connect-manual-instagram";
import type { InstagramConnectConfig } from "@/types/instagram.types";

type InstagramManualConnectProps = {
  config: InstagramConnectConfig;
  onConnected?: () => void;
};

export function InstagramManualConnect({
  config,
  onConnected,
}: InstagramManualConnectProps) {
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [igUserId, setIgUserId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");

  const { connect, isLoading } = useConnectManualInstagram({
    onSuccess: onConnected,
  });

  const canSubmit =
    config.isConfigured && pageId.trim() && accessToken.trim();

  async function handleConnect() {
    if (!canSubmit) {
      return;
    }

    await connect({
      pageId: pageId.trim(),
      accessToken: accessToken.trim(),
      igUserId: igUserId.trim() || undefined,
      businessAccountId: businessAccountId.trim() || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">{INSTAGRAM_MESSAGES.requirementsTitle}</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {INSTAGRAM_MESSAGES.requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {config.webhookUrl ? (
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p>
            <span className="font-medium">{INSTAGRAM_MESSAGES.webhookUrlLabel}:</span>
          </p>
          <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
            {config.webhookUrl}
          </code>
          <p className="text-xs text-muted-foreground">
            {INSTAGRAM_MESSAGES.verifyTokenLabel}: set in Meta and match{" "}
            <code className="rounded bg-muted px-1">INSTAGRAM_VERIFY_TOKEN</code>{" "}
            on Vercel. {INSTAGRAM_MESSAGES.verifyTokenHint}
          </p>
        </div>
      ) : (
        <p className="text-sm text-destructive">{INSTAGRAM_MESSAGES.notConfigured}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="instagram-page-id">{INSTAGRAM_MESSAGES.pageIdLabel}</Label>
        <Input
          id="instagram-page-id"
          autoComplete="off"
          placeholder={INSTAGRAM_MESSAGES.pageIdPlaceholder}
          value={pageId}
          onChange={(event) => setPageId(event.target.value)}
          disabled={isLoading || !config.isConfigured}
        />
        <p className="text-xs text-muted-foreground">{INSTAGRAM_MESSAGES.pageIdHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagram-access-token">
          {INSTAGRAM_MESSAGES.accessTokenLabel}
        </Label>
        <Input
          id="instagram-access-token"
          type="password"
          autoComplete="off"
          placeholder={INSTAGRAM_MESSAGES.accessTokenPlaceholder}
          value={accessToken}
          onChange={(event) => setAccessToken(event.target.value)}
          disabled={isLoading || !config.isConfigured}
        />
        <p className="text-xs text-muted-foreground">
          {INSTAGRAM_MESSAGES.accessTokenHint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagram-ig-user-id">
          {INSTAGRAM_MESSAGES.igUserIdLabel}
        </Label>
        <Input
          id="instagram-ig-user-id"
          autoComplete="off"
          placeholder={INSTAGRAM_MESSAGES.igUserIdPlaceholder}
          value={igUserId}
          onChange={(event) => setIgUserId(event.target.value)}
          disabled={isLoading || !config.isConfigured}
        />
        <p className="text-xs text-muted-foreground">{INSTAGRAM_MESSAGES.igUserIdHint}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagram-business-account-id">
          {INSTAGRAM_MESSAGES.businessAccountIdLabel}
        </Label>
        <Input
          id="instagram-business-account-id"
          autoComplete="off"
          placeholder={INSTAGRAM_MESSAGES.businessAccountIdPlaceholder}
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
            {INSTAGRAM_MESSAGES.connectWaiting}
          </>
        ) : (
          <>
            <Camera className="size-4" />
            {INSTAGRAM_MESSAGES.connectTitle}
          </>
        )}
      </Button>
    </div>
  );
}
