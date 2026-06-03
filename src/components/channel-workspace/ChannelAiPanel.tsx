"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

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
import {
  CHANNEL_WORKSPACE_MESSAGES,
  getChannelLabel,
  saveChannelAiSettingsAction,
  testChannelAiReplyAction,
} from "@/features/channel-workspace";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";
import { AI_LANGUAGE_OPTIONS } from "@/types/channel-workspace.types";

type ChannelAiPanelProps = {
  data: ChannelAiSettingsData;
};

export function ChannelAiPanel({ data }: ChannelAiPanelProps) {
  const label = getChannelLabel(data.channel);
  const [aiEnabled, setAiEnabled] = useState(data.aiEnabled);
  const [language, setLanguage] = useState(data.language);
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt);
  const [testMessage, setTestMessage] = useState("");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  if (!data.hasBusiness) {
    return null;
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveChannelAiSettingsAction({
        channel: data.channel,
        aiEnabled,
        language,
        systemPrompt,
      });

      if (result.success) {
        toast.success(CHANNEL_WORKSPACE_MESSAGES.aiSaved);
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
      const result = await testChannelAiReplyAction({
        channel: data.channel,
        testMessage: testMessage.trim(),
      });

      if (result.success) {
        setTestReply(result.reply);
        return;
      }

      toast.error(result.message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
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
          {!data.geminiConfigured ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {CHANNEL_WORKSPACE_MESSAGES.aiGeminiMissing}
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
              disabled={isSaving || !data.geminiConfigured}
              onClick={() => setAiEnabled((value) => !value)}
            >
              {aiEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

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

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">Model:</span>{" "}
              {data.model}
            </span>
          </div>

          <Button
            type="button"
            disabled={isSaving || !data.geminiConfigured}
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
        <CardHeader>
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
            disabled={!data.geminiConfigured || isTesting}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!data.geminiConfigured || isTesting || !testMessage.trim()}
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
