"use client";

import { useState } from "react";
import { Loader2Icon, PhoneCallIcon } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { saveVoiceAgentSettingsAction } from "@/features/ai-assistant/actions/save-voice-agent-settings";
import { triggerTestVoiceCallAction } from "@/features/ai-assistant/actions/trigger-test-voice-call";
import { VOICE_AGENT_MESSAGES } from "@/features/subscription/constants";
import { VOICE_PROVIDERS, type VoiceProvider } from "@/types/voice-agent.types";
import type { VoiceAgentSettings, VoiceCallLogItem } from "@/types/voice-agent.types";

type VoiceAgentPanelProps = {
  settings: VoiceAgentSettings;
  recentCalls: VoiceCallLogItem[];
};

export function VoiceAgentPanel({
  settings,
  recentCalls,
}: VoiceAgentPanelProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [provider, setProvider] = useState<VoiceProvider>(settings.provider);
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber);
  const [outboundEnabled, setOutboundEnabled] = useState(
    settings.outboundEnabled,
  );
  const [inboundEnabled, setInboundEnabled] = useState(settings.inboundEnabled);
  const [callbackAfterOrder, setCallbackAfterOrder] = useState(
    settings.callbackAfterOrder,
  );
  const [callbackDelayMinutes, setCallbackDelayMinutes] = useState(
    String(settings.callbackDelayMinutes),
  );
  const [outboundScript, setOutboundScript] = useState(settings.outboundScript);
  const [inboundGreeting, setInboundGreeting] = useState(
    settings.inboundGreeting,
  );
  const [retellAgentId, setRetellAgentId] = useState(settings.retellAgentId);
  const [vapiAssistantId, setVapiAssistantId] = useState(
    settings.vapiAssistantId,
  );
  const [twilioPhoneSid, setTwilioPhoneSid] = useState(settings.twilioPhoneSid);
  const [testPhone, setTestPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveVoiceAgentSettingsAction({
        enabled,
        provider,
        phoneNumber,
        outboundEnabled,
        inboundEnabled,
        callbackAfterOrder,
        callbackDelayMinutes: Number(callbackDelayMinutes),
        outboundScript,
        inboundGreeting,
        retellAgentId,
        vapiAssistantId,
        twilioPhoneSid,
      });

      if (!result.success) {
        toast.error(result.message ?? VOICE_AGENT_MESSAGES.saveFailed);
        return;
      }

      toast.success(VOICE_AGENT_MESSAGES.saved);
    } finally {
      setIsSaving(false);
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
        toast.error(result.message ?? VOICE_AGENT_MESSAGES.testCallFailed);
        return;
      }

      toast.success(VOICE_AGENT_MESSAGES.testCallSent);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PhoneCallIcon className="size-5 text-primary" />
          <CardTitle>{VOICE_AGENT_MESSAGES.panelTitle}</CardTitle>
        </div>
        <CardDescription>{VOICE_AGENT_MESSAGES.panelDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings.providerConfigured ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            {VOICE_AGENT_MESSAGES.providerMissing}
          </p>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="size-4 rounded border"
          />
          {VOICE_AGENT_MESSAGES.enabled}
        </label>

        <div className="space-y-2">
          <Label>{VOICE_AGENT_MESSAGES.provider}</Label>
          <select
            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={provider}
            onChange={(event) => setProvider(event.target.value as VoiceProvider)}
          >
            {VOICE_PROVIDERS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice-phone">{VOICE_AGENT_MESSAGES.phoneNumber}</Label>
          <Input
            id="voice-phone"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+12025550123"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={outboundEnabled}
            onChange={(event) => setOutboundEnabled(event.target.checked)}
            className="size-4 rounded border"
          />
          {VOICE_AGENT_MESSAGES.outboundEnabled}
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inboundEnabled}
            onChange={(event) => setInboundEnabled(event.target.checked)}
            className="size-4 rounded border"
          />
          {VOICE_AGENT_MESSAGES.inboundEnabled}
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={callbackAfterOrder}
            onChange={(event) => setCallbackAfterOrder(event.target.checked)}
            className="size-4 rounded border"
          />
          {VOICE_AGENT_MESSAGES.callbackAfterOrder}
        </label>

        <div className="space-y-2">
          <Label htmlFor="voice-delay">{VOICE_AGENT_MESSAGES.callbackDelay}</Label>
          <Input
            id="voice-delay"
            type="number"
            min={0}
            max={1440}
            value={callbackDelayMinutes}
            onChange={(event) => setCallbackDelayMinutes(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="outbound-script">
            {VOICE_AGENT_MESSAGES.outboundScript}
          </Label>
          <Textarea
            id="outbound-script"
            rows={3}
            value={outboundScript}
            onChange={(event) => setOutboundScript(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inbound-greeting">
            {VOICE_AGENT_MESSAGES.inboundGreeting}
          </Label>
          <Textarea
            id="inbound-greeting"
            rows={3}
            value={inboundGreeting}
            onChange={(event) => setInboundGreeting(event.target.value)}
          />
        </div>

        {provider === "retell" ? (
          <div className="space-y-2">
            <Label htmlFor="retell-agent">{VOICE_AGENT_MESSAGES.retellAgentId}</Label>
            <Input
              id="retell-agent"
              value={retellAgentId}
              onChange={(event) => setRetellAgentId(event.target.value)}
            />
          </div>
        ) : null}

        {provider === "vapi" ? (
          <div className="space-y-2">
            <Label htmlFor="vapi-assistant">
              {VOICE_AGENT_MESSAGES.vapiAssistantId}
            </Label>
            <Input
              id="vapi-assistant"
              value={vapiAssistantId}
              onChange={(event) => setVapiAssistantId(event.target.value)}
            />
          </div>
        ) : null}

        {provider === "twilio" || provider === "vapi" ? (
          <div className="space-y-2">
            <Label htmlFor="twilio-sid">{VOICE_AGENT_MESSAGES.twilioPhoneSid}</Label>
            <Input
              id="twilio-sid"
              value={twilioPhoneSid}
              onChange={(event) => setTwilioPhoneSid(event.target.value)}
            />
          </div>
        ) : null}

        <div className="space-y-1 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          <p>
            <span className="font-medium">{VOICE_AGENT_MESSAGES.webhookInbound}:</span>{" "}
            <code className="break-all">{settings.inboundWebhookUrl}</code>
          </p>
          <p>
            <span className="font-medium">{VOICE_AGENT_MESSAGES.webhookOutbound}:</span>{" "}
            <code className="break-all">{settings.outboundWebhookUrl}</code>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => {
              void handleSave();
            }}
          >
            {isSaving ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              VOICE_AGENT_MESSAGES.save
            )}
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="test-phone">{VOICE_AGENT_MESSAGES.testPhone}</Label>
          <Input
            id="test-phone"
            value={testPhone}
            onChange={(event) => setTestPhone(event.target.value)}
            placeholder="+12025550123"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isTesting || !testPhone.trim()}
            onClick={() => {
              void handleTestCall();
            }}
          >
            {isTesting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Calling...
              </>
            ) : (
              VOICE_AGENT_MESSAGES.testCall
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{VOICE_AGENT_MESSAGES.recentCalls}</p>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {VOICE_AGENT_MESSAGES.noCalls}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {recentCalls.map((call) => (
                <li
                  key={call.id}
                  className="flex justify-between gap-2 rounded border px-2 py-1"
                >
                  <span className="capitalize">
                    {call.direction} · {call.phoneNumber}
                  </span>
                  <span className="text-muted-foreground">{call.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
