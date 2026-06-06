"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2Icon,
  CopyIcon,
  Loader2Icon,
  PhoneCallIcon,
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
import {
  connectVoiceAgentAction,
  disconnectVoiceAgentAction,
} from "@/features/voice/actions/connect-voice";
import { triggerTestVoiceCallAction } from "@/features/voice/actions/trigger-test-voice-call";
import { toggleVoiceAiAction } from "@/features/voice/actions/toggle-voice-ai";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import type {
  VoiceAgentSettings,
  VoiceCallLogItem,
  VoiceConnectConfig,
  VoiceConnectionData,
} from "@/types/voice-agent.types";

type VoiceActivatePanelProps = {
  connection: VoiceConnectionData;
  settings: VoiceAgentSettings;
  recentCalls: VoiceCallLogItem[];
  config: VoiceConnectConfig;
  hasBusiness: boolean;
  embeddedInHub?: boolean;
};

function getStatusVariant(
  status: VoiceConnectionData["status"],
): "default" | "secondary" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function VoiceActivatePanel({
  connection,
  settings,
  recentCalls,
  config,
  hasBusiness,
  embeddedInHub = false,
}: VoiceActivatePanelProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState(
    connection.phoneNumber ?? settings.phoneNumber ?? "",
  );
  const [testPhone, setTestPhone] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(settings.aiEnabled);
  const [isTogglingAi, setIsTogglingAi] = useState(false);

  const cardClassName = embeddedInHub
    ? "w-full max-w-none border-0 bg-transparent shadow-none"
    : "max-w-2xl shadow-none";
  const headerClassName = embeddedInHub ? "px-0 pt-0" : undefined;
  const contentClassName = embeddedInHub ? "px-0 pb-0" : undefined;

  if (!hasBusiness) {
    return (
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{VOICE_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>{VOICE_MESSAGES.noBusinessDescription}</CardDescription>
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
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <CardTitle>{VOICE_MESSAGES.connectTitle}</CardTitle>
          <CardDescription>{VOICE_MESSAGES.platformMissing}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleConnect() {
    if (!phoneNumber.trim()) {
      return;
    }

    setIsConnecting(true);

    try {
      const result = await connectVoiceAgentAction({ phoneNumber });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.saveFailed);
        return;
      }

      toast.success(VOICE_MESSAGES.saved);
      router.refresh();
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);

    try {
      const result = await disconnectVoiceAgentAction();

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.saveFailed);
        return;
      }

      toast.message(VOICE_MESSAGES.disconnected);
      router.refresh();
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handleToggleAi(nextValue: boolean) {
    setIsTogglingAi(true);

    try {
      const result = await toggleVoiceAiAction(nextValue);

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.aiSaveFailed);
        return;
      }

      setAiEnabled(nextValue);
      toast.success(VOICE_MESSAGES.aiSaved);
      router.refresh();
    } finally {
      setIsTogglingAi(false);
    }
  }

  async function handleTestCall() {
    if (!testPhone.trim()) {
      return;
    }

    setIsTesting(true);

    try {
      const result = await triggerTestVoiceCallAction({
        phoneNumber: testPhone,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.testCallFailed);
        return;
      }

      toast.success(VOICE_MESSAGES.testCallSent);
      router.refresh();
    } finally {
      setIsTesting(false);
    }
  }

  if (connection.status === "connected") {
    return (
      <Card className={cardClassName}>
        <CardHeader className={headerClassName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <PhoneCallIcon className="size-5 text-indigo-600" />
                {VOICE_MESSAGES.connectedTitle}
              </CardTitle>
              <CardDescription>{connection.phoneNumber}</CardDescription>
            </div>
            <Badge variant={getStatusVariant(connection.status)}>connected</Badge>
          </div>
        </CardHeader>
        <CardContent className={`space-y-6 ${contentClassName ?? ""}`}>
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="space-y-1">
              <p className="font-medium">{VOICE_MESSAGES.autoCallbackTitle}</p>
              <p className="text-muted-foreground">
                {VOICE_MESSAGES.autoCallbackDescription}
              </p>
              <Button variant="link" className="h-auto p-0 text-sm" asChild>
                <Link
                  href={`${DASHBOARD_ROUTES.integrations}/website_forms?section=activate`}
                >
                  {VOICE_MESSAGES.websiteFormsLink}
                </Link>
              </Button>
            </div>
          </div>

          <VoiceAiSection
            aiEnabled={aiEnabled}
            aiConfigured={config.aiConfigured}
            isToggling={isTogglingAi}
            onToggle={handleToggleAi}
          />

          <VoiceCallHistory calls={recentCalls} />

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">{VOICE_MESSAGES.testCallTitle}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
                placeholder={VOICE_MESSAGES.phonePlaceholder}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isTesting || !testPhone.trim()}
                onClick={handleTestCall}
              >
                {isTesting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  VOICE_MESSAGES.testCallButton
                )}
              </Button>
            </div>
          </div>

          <VoiceAdvancedSetup settings={settings} />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDisconnecting}
              onClick={handleDisconnect}
            >
              {isDisconnecting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                VOICE_MESSAGES.disconnectButton
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className={headerClassName}>
        <CardTitle className="flex items-center gap-2">
          <PhoneCallIcon className="size-5 text-indigo-600" />
          {VOICE_MESSAGES.connectTitle}
        </CardTitle>
        <CardDescription>{VOICE_MESSAGES.connectDescription}</CardDescription>
      </CardHeader>
      <CardContent className={`space-y-5 ${contentClassName ?? ""}`}>
        <div className="space-y-2">
          <Label htmlFor="voice-phone">{VOICE_MESSAGES.phoneLabel}</Label>
          <Input
            id="voice-phone"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder={VOICE_MESSAGES.phonePlaceholder}
            autoComplete="tel"
          />
          <p className="text-xs text-muted-foreground">{VOICE_MESSAGES.phoneHint}</p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {VOICE_MESSAGES.autoCallbackTitle}
          </p>
          <p className="mt-1">{VOICE_MESSAGES.autoCallbackDescription}</p>
        </div>

        {config.aiConfigured ? (
          <p className="text-sm text-muted-foreground">{VOICE_MESSAGES.aiDescription}</p>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {VOICE_MESSAGES.aiMissing}
          </p>
        )}

        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={isConnecting || !phoneNumber.trim()}
          onClick={handleConnect}
        >
          {isConnecting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              …
            </>
          ) : (
            VOICE_MESSAGES.activateButton
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function VoiceAiSection({
  aiEnabled,
  aiConfigured,
  isToggling,
  onToggle,
}: {
  aiEnabled: boolean;
  aiConfigured: boolean;
  isToggling: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{VOICE_MESSAGES.aiTitle}</p>
          <p className="text-sm text-muted-foreground">
            {aiEnabled && aiConfigured
              ? VOICE_MESSAGES.aiActive
              : VOICE_MESSAGES.aiInactive}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border"
            checked={aiEnabled}
            disabled={!aiConfigured || isToggling}
            onChange={(event) => onToggle(event.target.checked)}
          />
          {VOICE_MESSAGES.aiEnabled}
        </label>
      </div>
      {!aiConfigured ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {VOICE_MESSAGES.aiMissing}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{VOICE_MESSAGES.knowledgeHint}</p>
      )}
    </div>
  );
}

function VoiceCallHistory({ calls }: { calls: VoiceCallLogItem[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{VOICE_MESSAGES.recentCallsTitle}</p>
      {calls.length === 0 ? (
        <p className="text-sm text-muted-foreground">{VOICE_MESSAGES.noCalls}</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {calls.map((call) => (
            <li
              key={call.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <span>
                {call.direction === "outbound" ? "→" : "←"} {call.phoneNumber}
              </span>
              <span className="text-xs text-muted-foreground">
                {call.status} · {new Date(call.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VoiceAdvancedSetup({ settings }: { settings: VoiceAgentSettings }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function copyUrl(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedField(label);
    toast.success(VOICE_MESSAGES.copied);
    window.setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <details className="rounded-lg border p-4 text-sm">
      <summary className="cursor-pointer font-medium">
        {VOICE_MESSAGES.advancedTitle}
      </summary>
      <p className="mt-2 text-muted-foreground">
        {VOICE_MESSAGES.advancedDescription}
      </p>
      <div className="mt-3 space-y-3">
        <WebhookCopyRow
          label={VOICE_MESSAGES.webhookInbound}
          value={settings.inboundWebhookUrl}
          copied={copiedField === "inbound"}
          onCopy={() => copyUrl("inbound", settings.inboundWebhookUrl)}
        />
        <WebhookCopyRow
          label={VOICE_MESSAGES.webhookOutbound}
          value={settings.outboundWebhookUrl}
          copied={copiedField === "outbound"}
          onCopy={() => copyUrl("outbound", settings.outboundWebhookUrl)}
        />
      </div>
    </details>
  );
}

function WebhookCopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1">
      <span className="font-medium">{label}</span>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={onCopy}>
          {copied ? (
            <CheckCircle2Icon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
