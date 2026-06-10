"use client";

import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  AI_PROVIDERS,
  AI_PROVIDER_LABELS,
  getDefaultModelForProvider,
  getModelsForProvider,
  type AiProvider,
} from "@/lib/ai/constants";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { CHANNEL_WORKSPACE_MESSAGES } from "@/features/channel-workspace";
import { cn } from "@/lib/utils";

type ProviderAvailability = Record<AiProvider, boolean>;

type AiModelProviderSelectProps = {
  provider: AiProvider;
  model: string;
  providerAvailability: ProviderAvailability;
  disabled?: boolean;
  onProviderChange: (provider: AiProvider) => void;
  onModelChange: (model: string) => void;
  idPrefix?: string;
};

const PROVIDER_HINTS: Record<AiProvider, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
};

export function AiModelProviderSelect({
  provider,
  model,
  providerAvailability,
  disabled = false,
  onProviderChange,
  onModelChange,
  idPrefix = "ai",
}: AiModelProviderSelectProps) {
  const modelOptions = getModelsForProvider(provider);
  const selectedModel = modelOptions.find((option) => option.id === model);
  const configuredCount = AI_PROVIDERS.filter(
    (value) => providerAvailability[value],
  ).length;

  function handleProviderChange(nextProvider: AiProvider) {
    if (!providerAvailability[nextProvider]) {
      return;
    }

    onProviderChange(nextProvider);
    onModelChange(getDefaultModelForProvider(nextProvider));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{AI_ASSISTANT_MESSAGES.aiProviderLabel}</Label>
        <p className="text-caption text-muted-foreground">
          {configuredCount > 0
            ? AI_ASSISTANT_MESSAGES.aiProvidersConfigured(configuredCount)
            : AI_ASSISTANT_MESSAGES.aiProvidersNone}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {AI_PROVIDERS.map((value) => {
            const isConfigured = providerAvailability[value];
            const isSelected = provider === value;

            return (
              <button
                key={value}
                type="button"
                disabled={disabled || !isConfigured}
                onClick={() => handleProviderChange(value)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  isSelected && isConfigured
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : isConfigured
                      ? "hover:bg-muted/50"
                      : "cursor-not-allowed border-dashed opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{AI_PROVIDER_LABELS[value]}</p>
                  {isConfigured ? (
                    <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {isConfigured
                    ? AI_ASSISTANT_MESSAGES.aiProviderReady
                    : AI_ASSISTANT_MESSAGES.aiProviderMissingEnv(
                        PROVIDER_HINTS[value],
                      )}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-model`}>
          {CHANNEL_WORKSPACE_MESSAGES.aiModelLabel}
        </Label>
        <select
          id={`${idPrefix}-model`}
          className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={model}
          onChange={(event) => onModelChange(event.target.value)}
          disabled={disabled || !providerAvailability[provider]}
        >
          {modelOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedModel ? (
          <p className="text-xs text-muted-foreground">
            {selectedModel.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
