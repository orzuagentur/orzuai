"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { AiModelProviderSelect } from "@/components/ai-assistant/AiModelProviderSelect";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  CHANNEL_WORKSPACE_MESSAGES,
  getChannelLabel,
  saveChannelAiSettingsAction,
  testChannelAiReplyAction,
} from "@/features/channel-workspace";
import {
  buildIntegrationActivateHref,
  type IntegrationChannelId,
} from "@/features/integrations";
import type { AiProvider } from "@/lib/ai/constants";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";
import { AI_LANGUAGE_OPTIONS } from "@/types/channel-workspace.types";

type ChannelAiPanelProps = {
  data: ChannelAiSettingsData;
};

export function ChannelAiPanel({ data }: ChannelAiPanelProps) {
  const router = useRouter();
  const label = getChannelLabel(data.channel);
  const [aiEnabled, setAiEnabled] = useState(data.aiEnabled);
  const [provider, setProvider] = useState<AiProvider>(
    (data.provider as AiProvider) ?? "gemini",
  );
  const [model, setModel] = useState(data.model);
  const [language, setLanguage] = useState(data.language);
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt);
  const [testMessage, setTestMessage] = useState("");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [matchedAgentName, setMatchedAgentName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const providerReady = data.providerAvailability[provider];

  if (!data.hasBusiness) {
    return null;
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveChannelAiSettingsAction({
        channel: data.channel,
        aiEnabled,
        provider,
        model,
        language,
        systemPrompt,
      });

      if (result.success) {
        toast.success(CHANNEL_WORKSPACE_MESSAGES.aiSaved);
        router.refresh();
        return;
      }

      toast.error(result.message ?? "Unable to save AI settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    if (!testMessage.trim()) {
      toast.error(CHANNEL_WORKSPACE_MESSAGES.aiTestEmpty);
      return;
    }

    setIsTesting(true);
    setTestReply(null);

    try {
      await saveChannelAiSettingsAction({
        channel: data.channel,
        aiEnabled,
        provider,
        model,
        language,
        systemPrompt,
      });

      const result = await testChannelAiReplyAction({
        channel: data.channel,
        testMessage: testMessage.trim(),
      });

      if (result.success) {
        setTestReply(result.reply);
        setMatchedAgentName(result.matchedAgentName ?? null);
        return;
      }

      toast.error(result.message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {!data.isChannelConnected ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <p>{AI_ASSISTANT_MESSAGES.channelNotConnected}</p>
          <Button asChild variant="link" className="mt-1 h-auto p-0">
            <Link
              href={buildIntegrationActivateHref(
                data.channel as IntegrationChannelId,
              )}
            >
              {AI_ASSISTANT_MESSAGES.goToIntegrations}
            </Link>
          </Button>
        </div>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            <CardTitle>
              {label} — {CHANNEL_WORKSPACE_MESSAGES.aiTitle}
            </CardTitle>
          </div>
          <CardDescription>{CHANNEL_WORKSPACE_MESSAGES.aiDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!providerReady ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {CHANNEL_WORKSPACE_MESSAGES.aiProviderMissing}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label>{CHANNEL_WORKSPACE_MESSAGES.aiEnabledLabel}</Label>
              <p className="text-sm text-muted-foreground">
                {aiEnabled
                  ? CHANNEL_WORKSPACE_MESSAGES.aiEnabledOn
                  : CHANNEL_WORKSPACE_MESSAGES.aiEnabledOff}
              </p>
            </div>
            <Button
              type="button"
              variant={aiEnabled ? "default" : "outline"}
              disabled={isSaving || !providerReady}
              onClick={() => setAiEnabled((value) => !value)}
            >
              {aiEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <AiModelProviderSelect
            idPrefix={`ai-${data.channel}`}
            provider={provider}
            model={model}
            providerAvailability={data.providerAvailability}
            disabled={isSaving}
            onProviderChange={setProvider}
            onModelChange={setModel}
          />

          <div className="space-y-2">
            <Label htmlFor={`ai-language-${data.channel}`}>
              {CHANNEL_WORKSPACE_MESSAGES.aiLanguageLabel}
            </Label>
            <select
              id={`ai-language-${data.channel}`}
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {AI_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`ai-prompt-${data.channel}`}>
              {CHANNEL_WORKSPACE_MESSAGES.aiSystemPromptLabel}
            </Label>
            <Textarea
              id={`ai-prompt-${data.channel}`}
              rows={6}
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="Describe your business, tone, and what the assistant should do..."
            />
            <p className="text-xs text-muted-foreground">
              {CHANNEL_WORKSPACE_MESSAGES.aiSystemPromptHint}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            {CHANNEL_WORKSPACE_MESSAGES.aiKnowledgeHint}{" "}
            <Link
              href={DASHBOARD_ROUTES.knowledgeBase}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Knowledge Base
            </Link>
          </p>

          <Button
            type="button"
            disabled={isSaving || !providerReady}
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
              CHANNEL_WORKSPACE_MESSAGES.aiSave
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader id="ai-test" className="scroll-mt-6">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            <CardTitle>{CHANNEL_WORKSPACE_MESSAGES.aiTestTitle}</CardTitle>
          </div>
          <CardDescription>
            {CHANNEL_WORKSPACE_MESSAGES.aiTestDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            rows={3}
            value={testMessage}
            onChange={(event) => setTestMessage(event.target.value)}
            placeholder={CHANNEL_WORKSPACE_MESSAGES.aiTestPlaceholder}
            disabled={!providerReady || isTesting}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!providerReady || isTesting || !testMessage.trim()}
            onClick={() => {
              void handleTest();
            }}
          >
            {isTesting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              CHANNEL_WORKSPACE_MESSAGES.aiTestButton
            )}
          </Button>
          {matchedAgentName ? (
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.testMatchAgent(matchedAgentName)}
            </p>
          ) : testReply ? (
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.testMatchFallback}
            </p>
          ) : null}
          {testReply ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
              {testReply}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
