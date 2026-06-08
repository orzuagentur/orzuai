"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

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
import { buildChannelWorkspaceHref } from "@/features/integrations";
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
      toast.success(WEBSITE_FORMS_MESSAGES.copySuccess);
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

function CmsInstructions({ webhookUrl }: { webhookUrl: string }) {
  const sampleJson = `{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+998901234567",
  "message": "I want a quote",
  "form_name": "Contact form"
}`;

  const htmlSnippet = `<form id="orzu-lead-form">
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      message: fd.get("message"),
      form_name: "Website contact"
    })
  });
  alert("Thank you!");
});
</script>`;

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3">
        <p className="font-medium">{WEBSITE_FORMS_MESSAGES.cmsGeneric}</p>
        <p className="text-muted-foreground">
          {WEBSITE_FORMS_MESSAGES.instructionsWebhook}
        </p>
        <CopyField label="Example JSON body" value={sampleJson} />
        <CopyField label="HTML + JavaScript (paste before </body>)" value={htmlSnippet} />
      </div>
      <div className="space-y-3 text-muted-foreground">
        <p className="font-medium text-foreground">
          {WEBSITE_FORMS_MESSAGES.cmsWordPress}
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Install a webhook plugin (CF7 + webhook add-on or WP Webhooks).</li>
          <li>Set URL to your OrzuX Webhook URL.</li>
          <li>Map fields to: name, email, phone, message.</li>
        </ol>
      </div>
      <div className="space-y-2 text-muted-foreground">
        <p className="font-medium text-foreground">
          {WEBSITE_FORMS_MESSAGES.cmsShopify}
        </p>
        <p>
          Use Shopify Flow, Zapier, or Make.com → HTTP POST to your Webhook URL with
          the JSON example above.
        </p>
      </div>
    </div>
  );
}

export function WebsiteFormsActivatePanel({
  connection,
  hasBusiness,
  config,
  embeddedInHub = false,
}: WebsiteFormsActivatePanelProps) {
  const router = useRouter();
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null);
  const [siteName, setSiteName] = useState(connection?.siteName ?? "");
  const [siteUrl, setSiteUrl] = useState(connection?.siteUrl ?? "");
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
    : "max-w-3xl shadow-none";

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);

    try {
      const result = await updateWebsiteFormsSettingsAction({
        siteName,
        siteUrl,
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
  }, [autoFollowUp, followUpChannel, router, siteName, siteUrl]);

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

  const displayApiKey = revealedApiKey
    ? revealedApiKey
    : `${connection.apiKeyPrefix}••••••••••••`;

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
          <CardContent>
            <CopyField
              label={WEBSITE_FORMS_MESSAGES.apiKeyLabel}
              value={revealedApiKey}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{WEBSITE_FORMS_MESSAGES.connectTitle}</CardTitle>
            <Badge>connected</Badge>
          </div>
          <CardDescription>
            {WEBSITE_FORMS_MESSAGES.lastSubmission}:{" "}
            {connection.lastSubmissionAt
              ? new Date(connection.lastSubmissionAt).toLocaleString()
              : WEBSITE_FORMS_MESSAGES.never}
          </CardDescription>
        </CardHeader>
        <CardContent
          className={
            embeddedInHub ? "space-y-6 px-0 pb-0" : "space-y-6"
          }
        >
          <CopyField
            label={WEBSITE_FORMS_MESSAGES.webhookUrlLabel}
            value={connection.webhookUrl}
          />
          <CopyField
            label={WEBSITE_FORMS_MESSAGES.apiKeyLabel}
            value={displayApiKey}
            hint={WEBSITE_FORMS_MESSAGES.apiKeyHint}
          />
          <p className="text-xs text-muted-foreground">
            {WEBSITE_FORMS_MESSAGES.instructionsApiKey}
          </p>

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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={async () => {
                await disconnectWebsiteFormsAction();
                toast.success(WEBSITE_FORMS_MESSAGES.disconnectSuccess);
                router.refresh();
              }}
            >
              {WEBSITE_FORMS_MESSAGES.disconnect}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-name">{WEBSITE_FORMS_MESSAGES.siteNameLabel}</Label>
              <Input
                id="site-name"
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-url">{WEBSITE_FORMS_MESSAGES.siteUrlLabel}</Label>
              <Input
                id="site-url"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

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

          <Button type="button" disabled={saving} onClick={handleSaveSettings}>
            {saving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            {WEBSITE_FORMS_MESSAGES.saveSettings}
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link
              href={buildChannelWorkspaceHref("website_forms", "ai-assistant")}
            >
              Configure AI for Website Forms
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className={embeddedInHub ? "px-0 pt-0" : undefined}>
          <CardTitle className="text-base">{WEBSITE_FORMS_MESSAGES.cmsTitle}</CardTitle>
        </CardHeader>
        <CardContent className={embeddedInHub ? "px-0 pb-0" : undefined}>
          <CmsInstructions webhookUrl={connection.webhookUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
