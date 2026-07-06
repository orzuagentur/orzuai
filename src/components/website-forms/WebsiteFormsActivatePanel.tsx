"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { GlobeIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { IntegrationCopyField } from "@/components/integrations/IntegrationCopyField";
import { IntegrationDangerZone } from "@/components/integrations/IntegrationDangerZone";
import { IntegrationHelpTip } from "@/components/integrations/IntegrationHelpTip";
import { IntegrationPlatformGuide } from "@/components/integrations/IntegrationPlatformGuide";
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
import {
  LEAD_FORMS_HELP,
  LEAD_FORMS_PLATFORM_GUIDES,
} from "@/features/integrations/integration-help";
import {
  disconnectWebsiteFormsAction,
  regenerateWebsiteFormApiKeyAction,
  updateWebsiteFormsSettingsAction,
  WEBSITE_FORMS_MESSAGES,
} from "@/features/website-forms";
import { useEnableWebsiteForms } from "@/hooks/use-enable-website-forms";
import type {
  WebsiteFormConnectConfig,
  WebsiteFormConnectionData,
  WebsiteFormFollowUpChannel,
} from "@/types/website-forms.types";

type WebsiteFormsActivatePanelProps = {
  connection: WebsiteFormConnectionData | null;
  hasBusiness: boolean;
  config: WebsiteFormConnectConfig;
  embeddedInHub?: boolean;
};

function buildHtmlExample(webhookUrl: string, apiKeyPlaceholder: string) {
  return `<form id="orzu-lead-form">
  <input name="name" placeholder="Name" required />
  <input name="email" type="email" placeholder="Email" />
  <input name="phone" placeholder="Phone" />
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit">Send</button>
</form>
<script>
document.getElementById("orzu-lead-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await fetch("${webhookUrl}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OrzuAI-Api-Key": "${apiKeyPlaceholder}"
    },
    body: JSON.stringify({
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      message: fd.get("message"),
      source_url: window.location.href
    })
  });
  alert("Thank you!");
});
</script>`;
}

export function WebsiteFormsActivatePanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: WebsiteFormsActivatePanelProps) {
  const router = useRouter();
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoFollowUp, setAutoFollowUp] = useState(
    connection?.autoFollowUpEnabled ?? true,
  );
  const [followUpChannel, setFollowUpChannel] = useState<WebsiteFormFollowUpChannel>(
    connection?.followUpChannel ?? "whatsapp",
  );
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { enableForms, isLoading } = useEnableWebsiteForms({
    onSuccess: (apiKey) => {
      if (apiKey) {
        setRevealedApiKey(apiKey);
      }
      router.refresh();
    },
  });

  const cardClass = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-4xl shadow-none";

  const displayApiKey = revealedApiKey
    ? revealedApiKey
    : connection?.apiKeyPrefix
      ? `${connection.apiKeyPrefix}••••••••••••`
      : "";

  const htmlExample = useMemo(() => {
    if (!connection) {
      return "";
    }

    return buildHtmlExample(
      connection.webhookUrl,
      revealedApiKey ?? "YOUR_API_KEY",
    );
  }, [connection, revealedApiKey]);

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);

    try {
      const result = await updateWebsiteFormsSettingsAction({
        autoFollowUpEnabled: autoFollowUp,
        followUpChannel,
      });

      if (result.success) {
        toast.success(WEBSITE_FORMS_MESSAGES.settingsSaved);
        router.refresh();
      } else {
        toast.error(result.message ?? WEBSITE_FORMS_MESSAGES.genericError);
      }
    } finally {
      setSaving(false);
    }
  }, [autoFollowUp, followUpChannel, router]);

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{WEBSITE_FORMS_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>
            {WEBSITE_FORMS_MESSAGES.noBusinessDescription}
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

  if (!config.isConfigured) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle>{WEBSITE_FORMS_MESSAGES.connectTitle}</CardTitle>
          <CardDescription>{WEBSITE_FORMS_MESSAGES.httpsRequired}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (connection?.status !== "connected") {
    return (
      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex items-center gap-2">
            <GlobeIcon className="size-5 text-primary" />
            <CardTitle>{WEBSITE_FORMS_MESSAGES.connectTitle}</CardTitle>
            <IntegrationHelpTip title={LEAD_FORMS_HELP.apiKey.title}>
              {LEAD_FORMS_HELP.apiKey.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </IntegrationHelpTip>
          </div>
          <CardDescription>{WEBSITE_FORMS_MESSAGES.connectDescription}</CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
          <Button
            type="button"
            size="lg"
            disabled={isLoading}
            onClick={() => enableForms()}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Enabling...
              </>
            ) : (
              WEBSITE_FORMS_MESSAGES.connectWithOneClick
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {revealedApiKey ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {WEBSITE_FORMS_MESSAGES.newKeyTitle}
            </CardTitle>
            <CardDescription>
              {WEBSITE_FORMS_MESSAGES.newKeyDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{WEBSITE_FORMS_MESSAGES.connectTitle}</CardTitle>
            <Badge>Connected</Badge>
          </div>
          <CardDescription>
            {WEBSITE_FORMS_MESSAGES.lastSubmission}:{" "}
            {connection.lastSubmissionAt
              ? new Date(connection.lastSubmissionAt).toLocaleString()
              : WEBSITE_FORMS_MESSAGES.never}
          </CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-6 px-0 pb-0" : "space-y-6"}>
          <IntegrationCopyField
            label={WEBSITE_FORMS_MESSAGES.webhookUrlLabel}
            value={connection.webhookUrl}
            helpTitle={LEAD_FORMS_HELP.webhookUrl.title}
            helpContent={LEAD_FORMS_HELP.webhookUrl.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          />

          <IntegrationCopyField
            label={WEBSITE_FORMS_MESSAGES.apiKeyLabel}
            value={displayApiKey}
            hint={WEBSITE_FORMS_MESSAGES.apiKeyHint}
            helpTitle={LEAD_FORMS_HELP.apiKey.title}
            helpContent={LEAD_FORMS_HELP.apiKey.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{WEBSITE_FORMS_MESSAGES.connectedSiteLabel}</Label>
              <IntegrationHelpTip title={LEAD_FORMS_HELP.connectedSite.title}>
                {LEAD_FORMS_HELP.connectedSite.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </IntegrationHelpTip>
            </div>
            <Input
              readOnly
              value={connection.siteUrl ?? ""}
              placeholder={WEBSITE_FORMS_MESSAGES.connectedSitePending}
              className="h-11 bg-muted/30 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {WEBSITE_FORMS_MESSAGES.connectedSiteHint}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={async () => {
                if (!window.confirm(WEBSITE_FORMS_MESSAGES.regenerateConfirm)) {
                  return;
                }

                setRegenerating(true);

                try {
                  const result = await regenerateWebsiteFormApiKeyAction();

                  if (result.success) {
                    setRevealedApiKey(result.data.apiKey);
                    toast.success(WEBSITE_FORMS_MESSAGES.copySuccess);
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
              {WEBSITE_FORMS_MESSAGES.regenerateKey}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <CardTitle className="text-base">{WEBSITE_FORMS_MESSAGES.setupGuideTitle}</CardTitle>
          <CardDescription>
            {WEBSITE_FORMS_MESSAGES.instructionsWebhook}
          </CardDescription>
        </CardHeader>
        <CardContent className={embeddedInHub ? "space-y-4 px-0 pb-0" : "space-y-4"}>
          <IntegrationPlatformGuide guides={LEAD_FORMS_PLATFORM_GUIDES} />
          <IntegrationCopyField
            label="HTML example (with API key header)"
            value={htmlExample}
            multiline
            helpTitle={LEAD_FORMS_HELP.webhookUrl.title}
            helpContent={
              <p>
                Replace YOUR_API_KEY with your real key. Include source_url so OrzuX
                can detect your site domain.
              </p>
            }
          />
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {WEBSITE_FORMS_MESSAGES.followUpTitle}
              </CardTitle>
              <IntegrationHelpTip title={LEAD_FORMS_HELP.followUp.title}>
                {LEAD_FORMS_HELP.followUp.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </IntegrationHelpTip>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showAdvanced ? (
          <CardContent className={embeddedInHub ? "space-y-4 px-0 pb-0" : "space-y-4"}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={autoFollowUp}
                onChange={(event) => setAutoFollowUp(event.target.checked)}
              />
              <span>
                <span className="font-medium">
                  {WEBSITE_FORMS_MESSAGES.autoFollowUpLabel}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {WEBSITE_FORMS_MESSAGES.followUpDescription}
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <Label htmlFor="follow-up-channel">
                {WEBSITE_FORMS_MESSAGES.followUpTitle}
              </Label>
              <select
                id="follow-up-channel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={followUpChannel}
                onChange={(event) =>
                  setFollowUpChannel(event.target.value as WebsiteFormFollowUpChannel)
                }
              >
                <option value="whatsapp">
                  {WEBSITE_FORMS_MESSAGES.followUpWhatsapp}
                </option>
                <option value="email">{WEBSITE_FORMS_MESSAGES.followUpEmail}</option>
                <option value="telegram">
                  {WEBSITE_FORMS_MESSAGES.followUpTelegram}
                </option>
                <option value="none">{WEBSITE_FORMS_MESSAGES.followUpNone}</option>
              </select>
            </div>

            <Button type="button" disabled={saving} onClick={() => void handleSaveSettings()}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {WEBSITE_FORMS_MESSAGES.saveSettings}
            </Button>
          </CardContent>
        ) : null}
      </Card>

      <IntegrationDangerZone
        resourceLabel="Lead Forms"
        successMessage={WEBSITE_FORMS_MESSAGES.disconnectSuccess}
        onDisconnect={disconnectWebsiteFormsAction}
      />
    </div>
  );
}
