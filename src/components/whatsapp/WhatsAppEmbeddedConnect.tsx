"use client";

import { Loader2Icon } from "lucide-react";
import { ConnectButton } from "360dialog-connect-button";

import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { useComplete360DialogEmbeddedSignup } from "@/hooks/use-complete-360dialog-embedded-signup";
import type { WhatsAppConnectConfig } from "@/types/whatsapp.types";

type WhatsAppEmbeddedConnectProps = {
  config: WhatsAppConnectConfig;
  onConnected?: () => void;
};

export function WhatsAppEmbeddedConnect({
  config,
  onConnected,
}: WhatsAppEmbeddedConnectProps) {
  const { complete, isLoading } = useComplete360DialogEmbeddedSignup({
    onSuccess: onConnected,
  });

  if (!config.embeddedSignupEnabled || !config.partnerId) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">
          {WHATSAPP_MESSAGES.embeddedConnectTitle}
        </h3>
        <p className="text-sm text-muted-foreground">
          {WHATSAPP_MESSAGES.embeddedConnectDescription}
        </p>
      </div>

      <ConnectButton
        partnerId={config.partnerId}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        label={
          isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2Icon className="size-4 animate-spin" />
              {WHATSAPP_MESSAGES.embeddedConnectWaiting}
            </span>
          ) : (
            WHATSAPP_MESSAGES.embeddedConnectButton
          )
        }
        queryParameters={{
          redirect_url: config.integrationsRedirectUrl,
        }}
        disabled={isLoading || !config.isConfigured}
        callback={(callbackObject) => {
          void complete({
            clientId: callbackObject.client,
            channelIds: callbackObject.channels,
          });
        }}
      />
    </div>
  );
}
