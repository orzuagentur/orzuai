"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  GlobeIcon,
  Loader2Icon,
  MessageCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { IntegrationCopyField } from "@/components/integrations/IntegrationCopyField";
import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { IntegrationHelpTip } from "@/components/integrations/IntegrationHelpTip";
import { IntegrationPlatformGuide } from "@/components/integrations/IntegrationPlatformGuide";
import {
  WebsiteChatAppearanceSettings,
  type WebsiteChatAppearanceFormValues,
} from "@/components/website-chat/WebsiteChatAppearanceSettings";
import { WebsiteChatWidgetPreview } from "@/components/website-chat/WebsiteChatWidgetPreview";
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
import { regenerateWebsiteChatApiKeyAction } from "@/features/website-chat/actions/regenerate-api-key";
import { updateWebsiteChatSettingsAction } from "@/features/website-chat/actions/update-settings";
import { WEBSITE_CHAT_HELP } from "@/features/integrations/integration-help";
import { WEBSITE_CHAT_MESSAGES } from "@/features/website-chat/constants";
import { WEBSITE_CHAT_DEFAULT_APPEARANCE } from "@/features/website-chat/widget-appearance";
import { useEnableWebsiteChat } from "@/hooks/use-enable-website-chat";
import type {
  WebsiteChatConnectConfig,
  WebsiteChatConnectionData,
} from "@/types/website-chat.types";
import { buildWebsiteChatEmbedSnippet } from "@/utils/website-chat-embed";

type WebsiteChatActivatePanelProps = {
  connection: WebsiteChatConnectionData | null;
  hasBusiness: boolean;
  config: WebsiteChatConnectConfig;
  embeddedInHub?: boolean;
};

const WEBSITE_CHAT_PLATFORM_GUIDES = [
  {
    id: "wordpress",
    label: "WordPress",
    steps: [
      "Install a header/footer script plugin (WPCode, Insert Headers and Footers).",
      "Paste the embed code in the footer section.",
      "Publish and send a test message from your site.",
    ],
  },
  {
    id: "html",
    label: "Custom HTML",
    steps: [
      "Paste the embed code before </body> on each page.",
      "Do not remove data-site-key from the script tag.",
      "Open your site and send a test chat message.",
    ],
  },
  {
    id: "shopify",
    label: "Shopify / CMS",
    steps: [
      "Add the embed code in theme settings → Custom code → Footer.",
      "Save and preview the storefront.",
      "Send a test message to confirm Inbox delivery.",
    ],
  },
] as const;

function toAppearanceValues(
  connection?: WebsiteChatConnectionData | null,
): WebsiteChatAppearanceFormValues {
  return {
    widgetTitle: connection?.widgetTitle ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.widgetTitle,
    welcomeMessage:
      connection?.welcomeMessage ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.welcomeMessage,
    primaryColor: connection?.primaryColor ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.primaryColor,
    launcherIcon: connection?.launcherIcon ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.launcherIcon,
    position: connection?.position ?? WEBSITE_CHAT_DEFAULT_APPEARANCE.position,
  };
}

export function WebsiteChatActivatePanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: WebsiteChatActivatePanelProps) {
  const router = useRouter();
  const [revealedSiteKey, setRevealedSiteKey] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<WebsiteChatAppearanceFormValues>(() =>
    toAppearanceValues(connection),
  );
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { enableChat, isLoading } = useEnableWebsiteChat({
    onSuccess: (siteKey) => {
      if (siteKey) {
        setRevealedSiteKey(siteKey);
      }
      router.refresh();
    },
  });

  const cardClass = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-5xl shadow-none";

  const displaySiteKey = revealedSiteKey
    ? revealedSiteKey
    : connection?.apiKeyPrefix
      ? `${connection.apiKeyPrefix}••••••••••••`
      : "";

  const embedSnippet = useMemo(() => {
    if (!connection) {
      return "";
    }

    if (revealedSiteKey) {
      return buildWebsiteChatEmbedSnippet(
        connection.embedScriptUrl,
        connection.widgetToken,
        revealedSiteKey,
      );
    }

    return connection.embedSnippet;
  }, [connection, revealedSiteKey]);

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);

    try {
      const result = await updateWebsiteChatSettingsAction(appearance);

      if (result.success) {
        toast.success(WEBSITE_CHAT_MESSAGES.settingsSaved);
        router.refresh();
      } else {
        toast.error(result.message ?? "Could not save settings");
      }
    } finally {
      setSaving(false);
    }
  }, [appearance, router]);

  const appearancePreviewCard = (
    <Card className={cardClass}>
      <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{WEBSITE_CHAT_MESSAGES.customizeTitle}</CardTitle>
          <IntegrationHelpTip title={WEBSITE_CHAT_HELP.appearance.title}>
            {WEBSITE_CHAT_HELP.appearance.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </IntegrationHelpTip>
        </div>
        <CardDescription>{WEBSITE_CHAT_MESSAGES.customizeDescription}</CardDescription>
      </CardHeader>
      <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <WebsiteChatAppearanceSettings values={appearance} onChange={setAppearance} />
          <div className="space-y-2">
            <Label>{WEBSITE_CHAT_MESSAGES.previewTitle}</Label>
            <WebsiteChatWidgetPreview appearance={appearance} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
      <div className="space-y-6">
        {appearancePreviewCard}
        <Card className={cardClass}>
          <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
            <div className="flex items-center gap-2">
              <MessageCircleIcon className="size-5 text-primary" />
              <CardTitle>{WEBSITE_CHAT_MESSAGES.connectTitle}</CardTitle>
              <IntegrationHelpTip title={WEBSITE_CHAT_HELP.embedCode.title}>
                {WEBSITE_CHAT_HELP.embedCode.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </IntegrationHelpTip>
            </div>
            <CardDescription>{WEBSITE_CHAT_MESSAGES.connectDescription}</CardDescription>
          </CardHeader>
          <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
            <Button
              type="button"
              size="lg"
              disabled={isLoading}
              onClick={() => enableChat(appearance)}
            >
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {revealedSiteKey ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{WEBSITE_CHAT_MESSAGES.newKeyTitle}</CardTitle>
            <CardDescription>{WEBSITE_CHAT_MESSAGES.newKeyDescription}</CardDescription>
          </CardHeader>
        </Card>
      ) : !connection.apiKeyPrefix ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connection key required</CardTitle>
            <CardDescription>
              Generate a connection key and update the embed code on your site.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {appearancePreviewCard}

      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GlobeIcon className="size-5 text-primary" />
              <CardTitle>Connection</CardTitle>
            </div>
            <Badge>Connected</Badge>
          </div>
          <CardDescription>{WEBSITE_CHAT_MESSAGES.previewDescription}</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-6 px-0 pb-0" : "space-y-6"}>
          <IntegrationCopyField
            label={WEBSITE_CHAT_MESSAGES.embedCodeLabel}
            value={embedSnippet}
            hint={WEBSITE_CHAT_MESSAGES.embedHint}
            multiline
            helpTitle={WEBSITE_CHAT_HELP.embedCode.title}
            helpContent={WEBSITE_CHAT_HELP.embedCode.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          />

          <IntegrationCopyField
            label={WEBSITE_CHAT_MESSAGES.connectionKeyLabel}
            value={displaySiteKey}
            hint={WEBSITE_CHAT_MESSAGES.connectionKeyHint}
            helpTitle={WEBSITE_CHAT_HELP.connectionKey.title}
            helpContent={WEBSITE_CHAT_HELP.connectionKey.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{WEBSITE_CHAT_MESSAGES.connectedSiteLabel}</Label>
              <IntegrationHelpTip title={WEBSITE_CHAT_HELP.connectedSite.title}>
                {WEBSITE_CHAT_HELP.connectedSite.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </IntegrationHelpTip>
            </div>
            <Input
              readOnly
              value={connection.siteUrl ?? ""}
              placeholder={WEBSITE_CHAT_MESSAGES.connectedSitePending}
              className="h-11 bg-muted/30 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {WEBSITE_CHAT_MESSAGES.connectedSiteHint}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={saving} onClick={() => void handleSaveSettings()}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {WEBSITE_CHAT_MESSAGES.saveSettings}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={async () => {
                if (!window.confirm(WEBSITE_CHAT_MESSAGES.regenerateConfirm)) {
                  return;
                }

                setRegenerating(true);

                try {
                  const result = await regenerateWebsiteChatApiKeyAction();

                  if (result.success) {
                    setRevealedSiteKey(result.data.siteKey);
                    toast.success(WEBSITE_CHAT_MESSAGES.copySuccess);
                    router.refresh();
                  } else {
                    toast.error(result.error.message);
                  }
                } finally {
                  setRegenerating(false);
                }
              }}
            >
              {regenerating ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              {WEBSITE_CHAT_MESSAGES.regenerateKey}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <CardTitle className="text-base">Platform setup</CardTitle>
          <CardDescription>Short steps for common website builders.</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
          <IntegrationPlatformGuide guides={WEBSITE_CHAT_PLATFORM_GUIDES} />
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
