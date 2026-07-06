"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  Loader2Icon,
  MessageCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
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
import { disconnectWebsiteChatAction } from "@/features/website-chat/actions/disconnect";
import { updateWebsiteChatSettingsAction } from "@/features/website-chat/actions/update-settings";
import { WEBSITE_CHAT_MESSAGES } from "@/features/website-chat/constants";
import { useEnableWebsiteChat } from "@/hooks/use-enable-website-chat";
import type {
  WebsiteChatConnectConfig,
  WebsiteChatConnectionData,
} from "@/types/website-chat.types";

type WebsiteChatActivatePanelProps = {
  connection: WebsiteChatConnectionData | null;
  hasBusiness: boolean;
  config: WebsiteChatConnectConfig;
  embeddedInHub?: boolean;
};

function CopyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(WEBSITE_CHAT_MESSAGES.copySuccess);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
          {copied ? (
            <CheckIcon className="size-4 text-green-600" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </Button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function WebsiteChatActivatePanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: WebsiteChatActivatePanelProps) {
  const router = useRouter();
  const [siteName, setSiteName] = useState(connection?.siteName ?? "");
  const [siteUrl, setSiteUrl] = useState(connection?.siteUrl ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(
    connection?.welcomeMessage ?? "Hi! How can we help you today?",
  );
  const [primaryColor, setPrimaryColor] = useState(
    connection?.primaryColor ?? "#6366f1",
  );
  const [saving, setSaving] = useState(false);

  const { enableChat, isLoading } = useEnableWebsiteChat();

  const cardClass = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-3xl shadow-none";

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);

    try {
      const result = await updateWebsiteChatSettingsAction({
        siteName,
        siteUrl,
        welcomeMessage,
        primaryColor,
      });

      if (result.success) {
        toast.success(WEBSITE_CHAT_MESSAGES.settingsSaved);
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not save settings");
      }
    } finally {
      setSaving(false);
    }
  }, [primaryColor, router, siteName, siteUrl, welcomeMessage]);

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{WEBSITE_CHAT_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>{WEBSITE_CHAT_MESSAGES.noBusinessDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!config.isConfigured) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle>{WEBSITE_CHAT_MESSAGES.connectTitle}</CardTitle>
          <CardDescription>{WEBSITE_CHAT_MESSAGES.notConfigured}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (connection?.status !== "connected") {
    return (
      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex items-center gap-2">
            <MessageCircleIcon className="size-5 text-primary" />
            <CardTitle>{WEBSITE_CHAT_MESSAGES.connectTitle}</CardTitle>
          </div>
          <CardDescription>{WEBSITE_CHAT_MESSAGES.connectDescription}</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
          <Button type="button" size="lg" disabled={isLoading} onClick={() => enableChat()}>
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Enabling...
              </>
            ) : (
              WEBSITE_CHAT_MESSAGES.connectButton
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GlobeIcon className="size-5 text-primary" />
              <CardTitle>{WEBSITE_CHAT_MESSAGES.connectTitle}</CardTitle>
            </div>
            <Badge>Connected</Badge>
          </div>
          <CardDescription>{WEBSITE_CHAT_MESSAGES.previewDescription}</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-6 px-0 pb-0" : "space-y-6"}>
          <CopyField
            label={WEBSITE_CHAT_MESSAGES.embedCodeLabel}
            value={connection.embedSnippet}
            hint={WEBSITE_CHAT_MESSAGES.embedHint}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wc-site-name">{WEBSITE_CHAT_MESSAGES.siteNameLabel}</Label>
              <Input
                id="wc-site-name"
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wc-site-url">{WEBSITE_CHAT_MESSAGES.siteUrlLabel}</Label>
              <Input
                id="wc-site-url"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wc-welcome">{WEBSITE_CHAT_MESSAGES.welcomeMessageLabel}</Label>
            <Input
              id="wc-welcome"
              value={welcomeMessage}
              onChange={(event) => setWelcomeMessage(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wc-color">{WEBSITE_CHAT_MESSAGES.primaryColorLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="wc-color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="font-mono"
              />
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="size-10 cursor-pointer rounded-md border"
                aria-label={WEBSITE_CHAT_MESSAGES.primaryColorLabel}
              />
            </div>
          </div>

          <Button type="button" disabled={saving} onClick={() => void handleSaveSettings()}>
            {saving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              WEBSITE_CHAT_MESSAGES.saveSettings
            )}
          </Button>
        </CardContent>
      </Card>

      <IntegrationDangerZone
        resourceLabel="Website Chat"
        successMessage={WEBSITE_CHAT_MESSAGES.disconnectSuccess}
        onDisconnect={disconnectWebsiteChatAction}
      />
    </div>
  );
}
