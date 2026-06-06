"use client";

import { Label } from "@/components/ui/label";
import {
  AI_PROVIDER_LABELS,
  getDefaultModelForProvider,
  getModelsForProvider,
  type AiProvider,
} from "@/lib/ai/constants";
import { CHANNEL_WORKSPACE_MESSAGES } from "@/features/channel-workspace";

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

  function handleProviderChange(nextProvider: AiProvider) {
    onProviderChange(nextProvider);
    onModelChange(getDefaultModelForProvider(nextProvider));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-provider`}>AI provider</Label>
        <select
          id={`${idPrefix}-provider`}
          className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={provider}
          onChange={(event) =>
            handleProviderChange(event.target.value as AiProvider)
          }
          disabled={disabled}
        >
          {(Object.keys(AI_PROVIDER_LABELS) as AiProvider[]).map((value) => (
            <option key={value} value={value} disabled={!providerAvailability[value]}>
              {AI_PROVIDER_LABELS[value]}
              {!providerAvailability[value] ? " (not configured)" : ""}
            </option>
          ))}
        </select>
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
