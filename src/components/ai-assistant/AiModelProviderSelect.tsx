"use client";

import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_PROVIDERS,
  AI_PROVIDER_LABELS,
  CUSTOM_MODEL_OPTION_ID,
  getDefaultModelForProvider,
  getModelsForProvider,
  type AiProvider,
} from "@/lib/ai/constants";
import {
  getAiKeyDisplayName,
  getAiKeyProviderLabel,
} from "@/features/ai-assistant/ai-key-display";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  getProviderKeySource,
  type ProviderKeySource,
} from "@/features/ai-assistant/provider-availability";
import { CHANNEL_WORKSPACE_MESSAGES } from "@/features/channel-workspace";
import type { BusinessProviderCredential } from "@/services/business-ai-credentials.service";
import type { AiProviderAvailability } from "@/types/channel-workspace.types";
import { cn } from "@/lib/utils";

type AiModelProviderSelectProps = {
  provider: AiProvider;
  model: string;
  providerAvailability: AiProviderAvailability;
  platformAvailability?: AiProviderAvailability;
  businessCredentials?: BusinessProviderCredential[];
  useCustomModel?: boolean;
  disabled?: boolean;
  onProviderChange: (provider: AiProvider) => void;
  onModelChange: (model: string) => void;
  onUseCustomModelChange?: (useCustomModel: boolean) => void;
  idPrefix?: string;
};

const PROVIDER_HINTS: Record<AiProvider, string> = {
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
};

function providerStatusMessage(
  source: ProviderKeySource,
  credential?: BusinessProviderCredential,
): string {
  if (source === "business" && credential?.configured) {
    return `${getAiKeyDisplayName(credential)} · ${getAiKeyProviderLabel(credential)}`;
  }

  if (source === "business") {
    return AI_ASSISTANT_MESSAGES.aiProviderOwnKey;
  }

  if (source === "platform") {
    return AI_ASSISTANT_MESSAGES.aiProviderPlatformIncluded;
  }

  return AI_ASSISTANT_MESSAGES.aiProviderAddOwnKey;
}

export function AiModelProviderSelect({
  provider,
  model,
  providerAvailability,
  platformAvailability,
  businessCredentials = [],
  useCustomModel = false,
  disabled = false,
  onProviderChange,
  onModelChange,
  onUseCustomModelChange,
  idPrefix = "ai",
}: AiModelProviderSelectProps) {
  const platform = platformAvailability ?? providerAvailability;
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

    if (useCustomModel) {
      onModelChange("");
      return;
    }

    onModelChange(getDefaultModelForProvider(nextProvider));
  }

  function handleUseCustomModelChange(checked: boolean) {
    onUseCustomModelChange?.(checked);

    if (checked) {
      onModelChange(model.trim() || "");
      return;
    }

    onModelChange(getDefaultModelForProvider(provider));
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
            const keySource = getProviderKeySource(
              value,
              platform,
              businessCredentials,
            );
            const credential = businessCredentials.find(
              (entry) => entry.provider === value,
            );

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
                    ? providerStatusMessage(keySource, credential)
                    : AI_ASSISTANT_MESSAGES.aiProviderMissingEnv(
                        PROVIDER_HINTS[value],
                      )}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {onUseCustomModelChange ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={useCustomModel}
            disabled={disabled || !providerAvailability[provider]}
            onChange={(event) => handleUseCustomModelChange(event.target.checked)}
          />
          <span>
            <span className="font-medium">
              {AI_ASSISTANT_MESSAGES.aiCustomModelLabel}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.aiCustomModelHint}
            </span>
          </span>
        </label>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-model`}>
          {CHANNEL_WORKSPACE_MESSAGES.aiModelLabel}
        </Label>
        {useCustomModel ? (
          <Input
            id={`${idPrefix}-model`}
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            placeholder={AI_ASSISTANT_MESSAGES.aiCustomModelPlaceholder}
            disabled={disabled || !providerAvailability[provider]}
            className="max-w-md"
          />
        ) : (
          <select
            id={`${idPrefix}-model`}
            className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={
              modelOptions.some((option) => option.id === model)
                ? model
                : getDefaultModelForProvider(provider)
            }
            onChange={(event) => onModelChange(event.target.value)}
            disabled={disabled || !providerAvailability[provider]}
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
            {onUseCustomModelChange ? (
              <option value={CUSTOM_MODEL_OPTION_ID} disabled>
                Custom model (enable checkbox above)
              </option>
            ) : null}
          </select>
        )}
        {!useCustomModel && selectedModel ? (
          <p className="text-xs text-muted-foreground">
            {selectedModel.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
