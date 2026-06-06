"use client";

import { useState } from "react";
import { Globe2, Loader2Icon } from "lucide-react";
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
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { applyGlobalAiDefaultsAction } from "@/features/ai-assistant/actions/apply-global-ai-defaults";
import { CHANNEL_WORKSPACE_MESSAGES } from "@/features/channel-workspace";
import type { AiProvider } from "@/lib/ai/constants";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";
import { AI_LANGUAGE_OPTIONS } from "@/types/channel-workspace.types";

type AiGlobalDefaultsCardProps = {
  template: ChannelAiSettingsData;
};

export function AiGlobalDefaultsCard({ template }: AiGlobalDefaultsCardProps) {
  const [provider, setProvider] = useState<AiProvider>(
    (template.provider as AiProvider) ?? "gemini",
  );
  const [model, setModel] = useState(template.model);
  const [language, setLanguage] = useState(template.language);
  const [systemPrompt, setSystemPrompt] = useState(template.systemPrompt);
  const [applyAiEnabled, setApplyAiEnabled] = useState(false);
  const [globalAiEnabled, setGlobalAiEnabled] = useState(template.aiEnabled);
  const [isSaving, setIsSaving] = useState(false);

  const providerReady = template.providerAvailability[provider];

  async function handleApply() {
    setIsSaving(true);

    try {
      const result = await applyGlobalAiDefaultsAction({
        provider,
        model,
        language,
        systemPrompt,
        applyAiEnabled,
        aiEnabled: globalAiEnabled,
      });

      if (result.success) {
        toast.success(AI_ASSISTANT_MESSAGES.globalApplied);
        window.location.reload();
        return;
      }

      toast.error(result.message ?? "Unable to apply defaults.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe2 className="size-5 text-primary" />
          <CardTitle>{AI_ASSISTANT_MESSAGES.globalTitle}</CardTitle>
        </div>
        <CardDescription>{AI_ASSISTANT_MESSAGES.globalDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AiModelProviderSelect
          idPrefix="global-ai"
          provider={provider}
          model={model}
          providerAvailability={template.providerAvailability}
          disabled={isSaving}
          onProviderChange={setProvider}
          onModelChange={setModel}
        />

        <div className="space-y-2">
          <Label htmlFor="global-ai-language">
            {CHANNEL_WORKSPACE_MESSAGES.aiLanguageLabel}
          </Label>
          <select
            id="global-ai-language"
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
          <Label htmlFor="global-ai-prompt">
            {CHANNEL_WORKSPACE_MESSAGES.aiSystemPromptLabel}
          </Label>
          <Textarea
            id="global-ai-prompt"
            rows={4}
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={applyAiEnabled}
            onChange={(event) => setApplyAiEnabled(event.target.checked)}
            className="size-4 rounded border"
          />
          Also set enabled/disabled for all channels
        </label>

        {applyAiEnabled ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={globalAiEnabled}
              onChange={(event) => setGlobalAiEnabled(event.target.checked)}
              className="size-4 rounded border"
            />
            AI auto-replies enabled on all channels
          </label>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          disabled={isSaving || !providerReady}
          onClick={() => {
            void handleApply();
          }}
        >
          {isSaving ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Applying...
            </>
          ) : (
            AI_ASSISTANT_MESSAGES.globalApply
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
