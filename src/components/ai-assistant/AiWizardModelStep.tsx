"use client";

import { useMemo } from "react";
import {
  CheckCircle2Icon,
  KeyRoundIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAiKeyDisplayName,
  getAiKeyProviderLabel,
} from "@/features/ai-assistant/ai-key-display";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  AI_PROVIDERS,
  AI_PROVIDER_LABELS,
  getDefaultModelForProvider,
  getModelsForProvider,
  type AiProvider,
} from "@/lib/ai/constants";
import type { BusinessProviderCredential } from "@/services/business-ai-credentials.service";
import type { AiProviderAvailability } from "@/types/channel-workspace.types";
import { cn } from "@/lib/utils";

export type WizardBillingMode = "platform" | "own_key";

type AiWizardModelStepProps = {
  billingMode: WizardBillingMode;
  provider: AiProvider;
  model: string;
  useCustomModel: boolean;
  draftApiKey: string;
  draftKeyName: string;
  useForAllAgents: boolean;
  isReplacingKey: boolean;
  platformAvailability: AiProviderAvailability;
  businessCredentials: BusinessProviderCredential[];
  disabled?: boolean;
  onBillingModeChange: (mode: WizardBillingMode) => void;
  onProviderChange: (provider: AiProvider) => void;
  onModelChange: (model: string) => void;
  onUseCustomModelChange: (useCustomModel: boolean) => void;
  onDraftApiKeyChange: (apiKey: string) => void;
  onDraftKeyNameChange: (keyName: string) => void;
  onUseForAllAgentsChange: (value: boolean) => void;
  onReplacingKeyChange: (value: boolean) => void;
};

function firstPlatformProvider(
  availability: AiProviderAvailability,
): AiProvider | null {
  return AI_PROVIDERS.find((provider) => availability[provider]) ?? null;
}

function firstSavedProvider(
  credentials: BusinessProviderCredential[],
): AiProvider | null {
  return (
    credentials.find((credential) => credential.configured)?.provider ?? null
  );
}

export function isWizardModelStepValid(input: {
  billingMode: WizardBillingMode;
  provider: AiProvider;
  model: string;
  useCustomModel: boolean;
  draftApiKey: string;
  draftKeyName: string;
  isReplacingKey: boolean;
  platformAvailability: AiProviderAvailability;
  businessCredentials: BusinessProviderCredential[];
}): boolean {
  const {
    billingMode,
    provider,
    model,
    useCustomModel,
    draftApiKey,
    draftKeyName,
    isReplacingKey,
    platformAvailability,
    businessCredentials,
  } = input;

  if (useCustomModel && !model.trim()) {
    return false;
  }

  if (billingMode === "platform") {
    return platformAvailability[provider];
  }

  const hasSavedKey = businessCredentials.some(
    (credential) => credential.provider === provider && credential.configured,
  );

  if (hasSavedKey && !isReplacingKey) {
    return true;
  }

  return draftApiKey.trim().length >= 8 && draftKeyName.trim().length >= 1;
}

export function AiWizardModelStep({
  billingMode,
  provider,
  model,
  useCustomModel,
  draftApiKey,
  draftKeyName,
  useForAllAgents,
  isReplacingKey,
  platformAvailability,
  businessCredentials,
  disabled = false,
  onBillingModeChange,
  onProviderChange,
  onModelChange,
  onUseCustomModelChange,
  onDraftApiKeyChange,
  onDraftKeyNameChange,
  onUseForAllAgentsChange,
  onReplacingKeyChange,
}: AiWizardModelStepProps) {
  const platformAvailable = useMemo(
    () => AI_PROVIDERS.some((value) => platformAvailability[value]),
    [platformAvailability],
  );

  const credentialByProvider = useMemo(
    () => new Map(businessCredentials.map((entry) => [entry.provider, entry])),
    [businessCredentials],
  );

  const savedCredentials = useMemo(
    () => businessCredentials.filter((credential) => credential.configured),
    [businessCredentials],
  );

  const activeCredential = credentialByProvider.get(provider);
  const hasSavedKeyForProvider = activeCredential?.configured ?? false;
  const showNewKeyInput =
    billingMode === "own_key" && (!hasSavedKeyForProvider || isReplacingKey);
  const modelOptions = getModelsForProvider(provider);
  const selectedModel = modelOptions.find((option) => option.id === model);

  const providersForMode =
    billingMode === "platform"
      ? AI_PROVIDERS.filter((value) => platformAvailability[value])
      : AI_PROVIDERS;

  function handleBillingModeChange(mode: WizardBillingMode) {
    onBillingModeChange(mode);
    onReplacingKeyChange(false);
    onDraftApiKeyChange("");

    if (mode === "platform") {
      onUseCustomModelChange(false);
      const nextProvider = firstPlatformProvider(platformAvailability);

      if (nextProvider) {
        onProviderChange(nextProvider);
        onModelChange(getDefaultModelForProvider(nextProvider));
      }

      return;
    }

    const savedProvider = firstSavedProvider(businessCredentials);
    const nextProvider = savedProvider ?? provider;
    onProviderChange(nextProvider);
    onModelChange(getDefaultModelForProvider(nextProvider));
  }

  function handleProviderChange(nextProvider: AiProvider) {
    onProviderChange(nextProvider);
    onReplacingKeyChange(false);
    onDraftApiKeyChange("");
    onDraftKeyNameChange("");
    onModelChange(
      useCustomModel ? model : getDefaultModelForProvider(nextProvider),
    );
  }

  function handleSelectSavedKey(nextProvider: AiProvider) {
    handleProviderChange(nextProvider);
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-medium">
          {AI_ASSISTANT_MESSAGES.wizardStep3Title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {AI_ASSISTANT_MESSAGES.wizardStep3Description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          disabled={disabled || !platformAvailable}
          onClick={() => handleBillingModeChange("platform")}
          className={cn(
            "relative rounded-xl border p-5 text-left transition-colors",
            billingMode === "platform"
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : platformAvailable
                ? "hover:border-primary/30 hover:bg-muted/20"
                : "cursor-not-allowed opacity-60",
          )}
        >
          {platformAvailable ? (
            <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {AI_ASSISTANT_MESSAGES.wizardBillingPlatformBadge}
            </span>
          ) : null}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SparklesIcon className="size-5" />
            </div>
            <div className="space-y-2 pr-16">
              <p className="font-medium">
                {AI_ASSISTANT_MESSAGES.wizardBillingPlatformTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.wizardBillingPlatformDescription}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>{AI_ASSISTANT_MESSAGES.wizardBillingPlatformPoint1}</li>
                <li>{AI_ASSISTANT_MESSAGES.wizardBillingPlatformPoint2}</li>
              </ul>
            </div>
          </div>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleBillingModeChange("own_key")}
          className={cn(
            "rounded-xl border p-5 text-left transition-colors",
            billingMode === "own_key"
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "hover:border-primary/30 hover:bg-muted/20",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <KeyRoundIcon className="size-5" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">
                {AI_ASSISTANT_MESSAGES.wizardBillingOwnTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.wizardBillingOwnDescription}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>{AI_ASSISTANT_MESSAGES.wizardBillingOwnPoint1}</li>
                <li>{AI_ASSISTANT_MESSAGES.wizardBillingOwnPoint2}</li>
              </ul>
            </div>
          </div>
        </button>
      </div>

      {!platformAvailable ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {AI_ASSISTANT_MESSAGES.wizardStep3NoPlatform}
        </p>
      ) : null}

      <div className="space-y-6 rounded-xl border bg-card p-5 shadow-sm">
        {billingMode === "own_key" && savedCredentials.length > 0 ? (
          <div className="space-y-3">
            <div>
              <Label>{AI_ASSISTANT_MESSAGES.wizardSavedKeysTitle}</Label>
              <p className="text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.wizardSavedKeysHint}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedCredentials.map((credential) => {
                const isSelected =
                  provider === credential.provider && !isReplacingKey;

                return (
                  <button
                    key={credential.provider}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectSavedKey(credential.provider)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {getAiKeyDisplayName(credential)}
                      </p>
                      <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {getAiKeyProviderLabel(credential)}
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {credential.keyPreview}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>{AI_ASSISTANT_MESSAGES.aiProviderLabel}</Label>
          <p className="text-sm text-muted-foreground">
            {billingMode === "platform"
              ? AI_ASSISTANT_MESSAGES.wizardStep3PlatformProviderHint
              : AI_ASSISTANT_MESSAGES.wizardStep3OwnProviderHint}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {providersForMode.map((value) => {
              const isSelected = provider === value;

              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleProviderChange(value)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{AI_PROVIDER_LABELS[value]}</p>
                    {billingMode === "platform" ? (
                      platformAvailability[value] ? (
                        <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircleIcon className="size-4 shrink-0 text-muted-foreground" />
                      )
                    ) : credentialByProvider.get(value)?.configured ? (
                      <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {billingMode === "platform"
                      ? AI_ASSISTANT_MESSAGES.aiProviderPlatformIncluded
                      : credentialByProvider.get(value)?.configured
                        ? AI_ASSISTANT_MESSAGES.aiProviderOwnKey
                        : AI_ASSISTANT_MESSAGES.wizardBillingOwnKeyPending}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {billingMode === "own_key" && hasSavedKeyForProvider && !isReplacingKey ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {activeCredential
                  ? getAiKeyDisplayName(activeCredential)
                  : AI_ASSISTANT_MESSAGES.wizardUseSavedKey}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {activeCredential ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {getAiKeyProviderLabel(activeCredential)}
                  </Badge>
                ) : null}
                <p className="font-mono text-xs text-muted-foreground">
                  {activeCredential?.keyPreview}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onReplacingKeyChange(true);
                onDraftApiKeyChange("");
                onDraftKeyNameChange(activeCredential?.keyName ?? "");
              }}
            >
              {AI_ASSISTANT_MESSAGES.wizardReplaceSavedKey}
            </Button>
          </div>
        ) : null}

        {showNewKeyInput ? (
          <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
            <div>
              <Label htmlFor="wizard-api-key">
                {AI_ASSISTANT_MESSAGES.wizardAddNewKey}
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-api-key-name">
                {AI_ASSISTANT_MESSAGES.aiCredentialsKeyNameLabel}
              </Label>
              <Input
                id="wizard-api-key-name"
                value={draftKeyName}
                onChange={(event) => onDraftKeyNameChange(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.aiCredentialsKeyNamePlaceholder}
                disabled={disabled}
                className="max-w-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-api-key">
                {AI_ASSISTANT_MESSAGES.aiCredentialsKeyLabel}
              </Label>
              <Input
                id="wizard-api-key"
                type="password"
                autoComplete="off"
                value={draftApiKey}
                onChange={(event) => onDraftApiKeyChange(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.aiCredentialsKeyPlaceholder}
                disabled={disabled}
                className="max-w-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.wizardBillingOwnKeyHint}
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={useForAllAgents}
                disabled={disabled}
                onChange={(event) =>
                  onUseForAllAgentsChange(event.target.checked)
                }
              />
              <span>
                <span className="font-medium">
                  {AI_ASSISTANT_MESSAGES.wizardUseForAllAgents}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.wizardUseForAllAgentsHint}
                </span>
              </span>
            </label>
          </div>
        ) : null}

        {billingMode === "own_key" ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={useCustomModel}
              disabled={disabled}
              onChange={(event) => onUseCustomModelChange(event.target.checked)}
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
          <Label htmlFor="wizard-model-select">
            {AI_ASSISTANT_MESSAGES.aiModelLabel}
          </Label>
          {billingMode === "own_key" && useCustomModel ? (
            <Input
              id="wizard-model-select"
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
              placeholder={AI_ASSISTANT_MESSAGES.aiCustomModelPlaceholder}
              disabled={disabled}
              className="max-w-lg"
            />
          ) : (
            <select
              id="wizard-model-select"
              className="flex h-10 w-full max-w-lg rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={
                modelOptions.some((option) => option.id === model)
                  ? model
                  : getDefaultModelForProvider(provider)
              }
              onChange={(event) => onModelChange(event.target.value)}
              disabled={disabled}
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {selectedModel && !(billingMode === "own_key" && useCustomModel) ? (
            <p className="text-xs text-muted-foreground">
              {selectedModel.description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
