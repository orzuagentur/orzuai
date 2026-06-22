"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AgentConnectedChannelSelect } from "@/components/ai-assistant/AgentConnectedChannelSelect";
import { AgentRoutingConflictBanner } from "@/components/ai-assistant/AgentRoutingConflictBanner";
import { AiAgentChannelIconRow } from "@/components/ai-assistant/AiAgentChannelIconRow";
import { AiAgentWizardTestChat } from "@/components/ai-assistant/AiAgentWizardTestChat";
import { AiAgentIconPicker } from "@/components/ai-assistant/AiAgentIconPicker";
import { AiCommunicationStyleSelect } from "@/components/ai-assistant/AiCommunicationStyleSelect";
import {
  AiWizardModelStep,
  isWizardModelStepValid,
  type WizardBillingMode,
} from "@/components/ai-assistant/AiWizardModelStep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAiAgentAction } from "@/features/ai-assistant/actions/create-ai-agent";
import { saveBusinessAiProviderKeyAction } from "@/features/ai-assistant/actions/save-business-ai-provider-key";
import {
  AGENT_WIZARD_GOALS,
  AGENT_WIZARD_STEPS,
  getAgentWizardGoal,
  resolveGoalAiConfig,
  type AgentWizardGoalId,
  type AgentWizardStepId,
} from "@/features/ai-assistant/agent-wizard-catalog";
import { getConnectedMessagingChannels } from "@/features/ai-assistant/connected-channels";
import {
  DEFAULT_COMMUNICATION_STYLE,
  getCommunicationStyleLabel,
  type CommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";
import {
  DEFAULT_AGENT_ICON,
  type AgentIconId,
} from "@/features/ai-assistant/agent-icons";
import {
  findDefaultAgentConflicts,
  parseTriggerKeywordsInput,
} from "@/features/ai-assistant/agent-channel-routing";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import {
  AI_PROVIDER_LABELS,
  type AiProvider,
} from "@/lib/ai/constants";
import { cn } from "@/lib/utils";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { BusinessProviderCredential } from "@/services/business-ai-credentials.service";
import type {
  AiProviderAvailability,
  ChannelAiSettingsData,
} from "@/types/channel-workspace.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { resolveAgentMatch } from "@/utils/ai-agent-routing";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentCreateWizardProps = {
  step: AgentWizardStepId;
  goal: AgentWizardGoalId | null;
  activeChannel: MessagingIntegrationChannelId;
  activeChannelFilter: MessagingIntegrationChannelId | null;
  searchQuery: string;
  visibleChannelIds: MessagingIntegrationChannelId[];
  channelStatuses: IntegrationChannelStatusMap;
  channelDefaults: ChannelAiSettingsData;
  providerAvailability: AiProviderAvailability;
  platformProviderAvailability: AiProviderAvailability;
  businessProviderCredentials: BusinessProviderCredential[];
  preferCustomerAiKeys: boolean;
  allAgents: AiAgentItem[];
  onStepChange: (step: AgentWizardStepId, goal?: AgentWizardGoalId | null) => void;
  onCancel: () => void;
};

type WizardDraft = {
  name: string;
  systemPrompt: string;
  triggerKeywords: string;
  channels: MessagingIntegrationChannelId[];
  billingMode: WizardBillingMode;
  provider: AiProvider;
  model: string;
  useCustomModel: boolean;
  communicationStyle: CommunicationStyleId;
  icon: AgentIconId;
};

function defaultConnectedChannels(
  channelStatuses: IntegrationChannelStatusMap,
  visibleChannelIds: MessagingIntegrationChannelId[],
): MessagingIntegrationChannelId[] {
  return getConnectedMessagingChannels(channelStatuses, visibleChannelIds);
}

function defaultBillingMode(
  platformAvailability: AiProviderAvailability,
  credentials: BusinessProviderCredential[],
  preferCustomerAiKeys: boolean,
): WizardBillingMode {
  const hasSavedKeys = credentials.some((credential) => credential.configured);

  if (preferCustomerAiKeys && hasSavedKeys) {
    return "own_key";
  }

  return Object.values(platformAvailability).some(Boolean) ? "platform" : "own_key";
}

function defaultOwnKeyProvider(
  credentials: BusinessProviderCredential[],
): AiProvider {
  return (
    credentials.find((credential) => credential.configured)?.provider ?? "openai"
  );
}

export function AiAgentCreateWizard({
  step,
  goal,
  activeChannel,
  activeChannelFilter,
  searchQuery,
  visibleChannelIds,
  channelStatuses,
  channelDefaults,
  providerAvailability,
  platformProviderAvailability,
  businessProviderCredentials,
  preferCustomerAiKeys,
  allAgents,
  onStepChange,
  onCancel,
}: AiAgentCreateWizardProps) {
  const router = useRouter();
  const goalConfig = goal ? getAgentWizardGoal(goal) : null;
  const initializedGoalRef = useRef<AgentWizardGoalId | null>(null);

  const [draft, setDraft] = useState<WizardDraft>(() => ({
    name: "",
    systemPrompt: "",
    triggerKeywords: "",
    channels: defaultConnectedChannels(channelStatuses, visibleChannelIds),
    billingMode: defaultBillingMode(
      platformProviderAvailability,
      businessProviderCredentials,
      preferCustomerAiKeys,
    ),
    provider: "gemini",
    model: channelDefaults.model,
    useCustomModel: false,
    communicationStyle: DEFAULT_COMMUNICATION_STYLE,
    icon: DEFAULT_AGENT_ICON,
  }));
  const [draftApiKey, setDraftApiKey] = useState("");
  const [draftKeyName, setDraftKeyName] = useState("");
  const [useForAllAgents, setUseForAllAgents] = useState(true);
  const [isReplacingKey, setIsReplacingKey] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState(
    businessProviderCredentials,
  );
  const [routingPreviewMessage, setRoutingPreviewMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  useEffect(() => {
    setSavedCredentials(businessProviderCredentials);
  }, [businessProviderCredentials]);

  useEffect(() => {
    if (!goalConfig || !goal) {
      return;
    }

    if (initializedGoalRef.current === goal) {
      return;
    }

    const billingMode = defaultBillingMode(
      platformProviderAvailability,
      businessProviderCredentials,
      preferCustomerAiKeys,
    );
    const ownKeyProvider = defaultOwnKeyProvider(businessProviderCredentials);
    const ai = resolveGoalAiConfig(
      goalConfig,
      billingMode === "platform"
        ? platformProviderAvailability
        : providerAvailability,
    );

    initializedGoalRef.current = goal;
    setDraft({
      name: goalConfig.draft.name,
      systemPrompt: goalConfig.draft.systemPrompt,
      triggerKeywords: goalConfig.draft.triggerKeywords.join(", "),
      channels: defaultConnectedChannels(channelStatuses, visibleChannelIds),
      billingMode,
      provider:
        billingMode === "own_key" && ownKeyProvider
          ? ownKeyProvider
          : ai.provider,
      model: ai.model,
      useCustomModel: false,
      communicationStyle: DEFAULT_COMMUNICATION_STYLE,
      icon: goalConfig.iconId,
    });
    setDraftApiKey("");
    setUseForAllAgents(true);
    setIsReplacingKey(false);
    setRoutingPreviewMessage("");
  }, [
    businessProviderCredentials,
    channelStatuses,
    goal,
    goalConfig,
    platformProviderAvailability,
    preferCustomerAiKeys,
    providerAvailability,
    visibleChannelIds,
  ]);

  const previewChannel =
    draft.channels[0] ?? activeChannelFilter ?? activeChannel;

  const routingPreview = useMemo(() => {
    if (!routingPreviewMessage.trim() || !goalConfig) {
      return null;
    }

    const keywords = draft.triggerKeywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    const candidate: AiAgentItem = {
      id: "wizard-preview",
      name: draft.name || goalConfig.draft.name,
      systemPrompt: draft.systemPrompt,
      channels: draft.channels,
      triggerKeywords: keywords,
      enabled: true,
      goal: goal!,
      provider: draft.provider,
      model: draft.model,
      language: channelDefaults.language,
      communicationStyle: draft.communicationStyle,
      icon: draft.icon,
      useCustomModel: draft.useCustomModel,
      createdAt: "",
      updatedAt: "",
    };

    return resolveAgentMatch({
      agents: [candidate],
      channel: previewChannel,
      message: routingPreviewMessage,
    });
  }, [
    channelDefaults.language,
    draft,
    goalConfig,
    previewChannel,
    routingPreviewMessage,
  ]);

  const routingConflicts = useMemo(
    () =>
      findDefaultAgentConflicts(allAgents, {
        channels: draft.channels,
        triggerKeywords: parseTriggerKeywordsInput(draft.triggerKeywords),
      }),
    [allAgents, draft.channels, draft.triggerKeywords],
  );

  const modelStepValid = isWizardModelStepValid({
    billingMode: draft.billingMode,
    provider: draft.provider,
    model: draft.model,
    useCustomModel: draft.useCustomModel,
    draftApiKey,
    draftKeyName,
    isReplacingKey,
    platformAvailability: platformProviderAvailability,
    businessCredentials: savedCredentials,
  });

  const hasSelectedChannel = draft.channels.length > 0;
  const isBusy = isCreating || isSavingKey;

  function updateDraft<K extends keyof WizardDraft>(
    key: K,
    value: WizardDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleChannel(channel: MessagingIntegrationChannelId) {
    setDraft((current) => {
      const hasChannel = current.channels.includes(channel);

      if (hasChannel) {
        return {
          ...current,
          channels:
            current.channels.length === 1
              ? current.channels
              : current.channels.filter((item) => item !== channel),
        };
      }

      return { ...current, channels: [...current.channels, channel] };
    });
  }

  function handleSelectGoal(nextGoal: AgentWizardGoalId) {
    initializedGoalRef.current = null;
    onStepChange(2, nextGoal);
  }

  async function persistDraftApiKeyIfNeeded(): Promise<boolean> {
    if (draft.billingMode !== "own_key") {
      return true;
    }

    const trimmedKey = draftApiKey.trim();
    const trimmedKeyName = draftKeyName.trim();
    const hasSavedKey = savedCredentials.some(
      (credential) =>
        credential.provider === draft.provider && credential.configured,
    );
    const needsNewKey = !hasSavedKey || isReplacingKey;

    if (!needsNewKey) {
      return true;
    }

    if (!trimmedKey) {
      toast.error(AI_ASSISTANT_MESSAGES.aiCredentialsKeyRequired);
      return false;
    }

    if (!trimmedKeyName) {
      toast.error(AI_ASSISTANT_MESSAGES.aiCredentialsKeyNameRequired);
      return false;
    }

    setIsSavingKey(true);

    try {
      const result = await saveBusinessAiProviderKeyAction({
        provider: draft.provider,
        apiKey: trimmedKey,
        keyName: trimmedKeyName,
        useForAllAgents,
      });

      if (!result.success) {
        toast.error(
          result.message ?? AI_ASSISTANT_MESSAGES.aiCredentialsSaveFailed,
        );
        return false;
      }

      setSavedCredentials((current) =>
        current.map((credential) =>
          credential.provider === draft.provider
            ? {
                ...credential,
                configured: true,
                keyName: trimmedKeyName,
                keyPreview: `${trimmedKey.slice(0, 4)}••••${trimmedKey.slice(-4)}`,
              }
            : credential,
        ),
      );
      setDraftApiKey("");
      setDraftKeyName("");
      setIsReplacingKey(false);
      return true;
    } finally {
      setIsSavingKey(false);
    }
  }

  async function handleContinueFromModelStep() {
    if (!modelStepValid) {
      if (draft.billingMode === "own_key" && !draftApiKey.trim()) {
        toast.error(AI_ASSISTANT_MESSAGES.aiCredentialsKeyRequired);
      }

      return;
    }

    const saved = await persistDraftApiKeyIfNeeded();

    if (!saved) {
      return;
    }

    onStepChange(4, goal);
  }

  async function handleCreate(enableAfterCreate: boolean) {
    if (!goalConfig) {
      return;
    }

    const trimmedName = draft.name.trim();

    if (!trimmedName) {
      toast.error("Enter an agent name.");
      return;
    }

    if (draft.channels.length === 0) {
      toast.error("Select at least one channel.");
      return;
    }

    if (!modelStepValid) {
      toast.error("Configure an AI provider before creating the agent.");
      return;
    }

    if (routingConflicts.length > 0) {
      toast.error(routingConflicts[0]?.existingAgentName
        ? `A default agent already exists for this channel.`
        : "Fix routing conflicts before creating the agent.");
      return;
    }

    setIsCreating(true);

    try {
      const keySaved = await persistDraftApiKeyIfNeeded();

      if (!keySaved) {
        setIsCreating(false);
        return;
      }

      const result = await createAiAgentAction({
        name: trimmedName,
        systemPrompt: draft.systemPrompt.trim(),
        channels: draft.channels,
        triggerKeywords: draft.triggerKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        enabled: enableAfterCreate,
        goal: goal!,
        provider: draft.provider,
        model: draft.model,
        language: channelDefaults.language,
        communicationStyle: draft.communicationStyle,
        icon: draft.icon,
        useCustomModel: draft.useCustomModel,
      });

      if (!result.success) {
        toast.error(result.error.message);
        setIsCreating(false);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.agentSaved);

      router.push(
        buildAiAssistantHref({
          section: "agents",
          channel: activeChannelFilter,
          agent: result.id ?? null,
          q: searchQuery || null,
          edit: true,
          setup: false,
        }),
      );
      router.refresh();
    } catch {
      setIsCreating(false);
      toast.error(AI_ASSISTANT_MESSAGES.saveFailed);
    }
  }

  function billingModeLabel(): string {
    return draft.billingMode === "platform"
      ? AI_ASSISTANT_MESSAGES.wizardBillingPlatformTitle
      : AI_ASSISTANT_MESSAGES.wizardBillingOwnTitle;
  }

  const isTestStep = step === 4;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {isCreating ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/95 px-6 text-center">
          <Loader2Icon className="size-8 animate-spin text-primary" />
          <p className="text-base font-medium">
            {AI_ASSISTANT_MESSAGES.creatingAgent}
          </p>
        </div>
      ) : null}

      <header
        className={cn(
          "shrink-0 border-b bg-background",
          isTestStep ? "px-3 py-2 md:px-4" : "px-4 py-4 md:px-8",
        )}
      >
        {isTestStep ? (
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium">
              {AI_ASSISTANT_MESSAGES.wizardStepTestTitle}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onCancel}
              disabled={isBusy}
              aria-label={AI_ASSISTANT_MESSAGES.createAgentCancel}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {AI_ASSISTANT_MESSAGES.wizardTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.wizardSubtitle}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onCancel}
              disabled={isBusy}
              aria-label={AI_ASSISTANT_MESSAGES.createAgentCancel}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        )}

        <div
          className={cn(
            "mx-auto flex items-center gap-2",
            isTestStep ? "mt-2 w-full max-w-none" : "mt-6 max-w-4xl",
          )}
        >
          {AGENT_WIZARD_STEPS.map((wizardStep, index) => {
            const isActive = step === wizardStep.id;
            const isComplete = step > wizardStep.id;

            return (
              <div key={wizardStep.id} className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "border-2 border-primary text-primary"
                        : "border border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {isComplete ? <CheckIcon className="size-3.5" /> : wizardStep.id}
                </div>
                <span
                  className={cn(
                    "hidden truncate text-sm sm:inline",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {wizardStep.label}
                </span>
                {index < AGENT_WIZARD_STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "mx-1 hidden h-px flex-1 sm:block",
                      isComplete ? "bg-primary/40" : "bg-border",
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </header>

      <div
        className={cn(
          "min-h-0 flex-1",
          isTestStep
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto px-4 py-6 md:px-8",
        )}
      >
        <div
          className={cn(
            isTestStep
              ? "flex min-h-0 w-full flex-1 flex-col"
              : "mx-auto max-w-4xl",
          )}
        >
          {step === 1 ? (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">
                  {AI_ASSISTANT_MESSAGES.wizardStep1Title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.wizardStep1Description}
                </p>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.crmAgentsVoiceNotice}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {AGENT_WIZARD_GOALS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSelectGoal(entry.id)}
                    className="group flex flex-col rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <entry.icon className="size-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{entry.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-medium text-primary">
                      {entry.benefit}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Continue
                      <ArrowRightIcon className="size-4" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 2 && goalConfig ? (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">
                  {AI_ASSISTANT_MESSAGES.wizardStep2Title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.wizardStep2Description}
                </p>
              </div>

              <AgentConnectedChannelSelect
                selectedChannels={draft.channels}
                visibleChannelIds={visibleChannelIds}
                channelStatuses={channelStatuses}
                disabled={isBusy}
                onToggle={toggleChannel}
              />
            </section>
          ) : null}

          {step === 3 && goalConfig ? (
            <AiWizardModelStep
              billingMode={draft.billingMode}
              provider={draft.provider}
              model={draft.model}
              useCustomModel={draft.useCustomModel}
              draftApiKey={draftApiKey}
              draftKeyName={draftKeyName}
              useForAllAgents={useForAllAgents}
              isReplacingKey={isReplacingKey}
              platformAvailability={platformProviderAvailability}
              businessCredentials={savedCredentials}
              disabled={isBusy}
              onBillingModeChange={(billingMode) =>
                updateDraft("billingMode", billingMode)
              }
              onProviderChange={(provider) => updateDraft("provider", provider)}
              onModelChange={(model) => updateDraft("model", model)}
              onUseCustomModelChange={(useCustomModel) =>
                updateDraft("useCustomModel", useCustomModel)
              }
              onDraftApiKeyChange={setDraftApiKey}
              onDraftKeyNameChange={setDraftKeyName}
              onUseForAllAgentsChange={setUseForAllAgents}
              onReplacingKeyChange={setIsReplacingKey}
            />
          ) : null}

          {step === 4 && goalConfig && goal ? (
            <section className="flex h-full min-h-0 flex-1 flex-col">
              <AiAgentWizardTestChat
                key={`${goal}-${draft.provider}-${draft.model}-${draft.systemPrompt}`}
                className="h-full min-h-0 flex-1"
                agentName={draft.name.trim() || goalConfig.draft.name}
                channel={previewChannel}
                goal={goal}
                systemPrompt={
                  draft.systemPrompt.trim() || goalConfig.draft.systemPrompt
                }
                provider={draft.provider}
                model={draft.model}
                language={channelDefaults.language}
                communicationStyle={draft.communicationStyle}
                disabled={isBusy}
              />
            </section>
          ) : null}

          {step === 5 && goalConfig ? (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">
                  {AI_ASSISTANT_MESSAGES.wizardStep4Title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.wizardStep4Description}
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="wizard-agent-name">
                      {AI_ASSISTANT_MESSAGES.agentName}
                    </Label>
                    <Input
                      id="wizard-agent-name"
                      value={draft.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                      disabled={isBusy}
                    />
                  </div>

                  <AiAgentIconPicker
                    value={draft.icon}
                    disabled={isBusy}
                    onChange={(icon) => updateDraft("icon", icon)}
                  />

                  <AiCommunicationStyleSelect
                    value={draft.communicationStyle}
                    disabled={isBusy}
                    onChange={(value) =>
                      updateDraft("communicationStyle", value)
                    }
                  />

                  <div className="space-y-2">
                    <Label htmlFor="wizard-agent-prompt">
                      {AI_ASSISTANT_MESSAGES.agentPrompt}
                    </Label>
                    <Textarea
                      id="wizard-agent-prompt"
                      value={draft.systemPrompt}
                      onChange={(event) =>
                        updateDraft("systemPrompt", event.target.value)
                      }
                      rows={6}
                      disabled={isBusy}
                    />
                  </div>

                  <AgentRoutingConflictBanner conflicts={routingConflicts} />

                  <div className="space-y-2">
                    <Label htmlFor="wizard-agent-keywords">
                      {AI_ASSISTANT_MESSAGES.agentTriggers}
                    </Label>
                    <Input
                      id="wizard-agent-keywords"
                      value={draft.triggerKeywords}
                      onChange={(event) =>
                        updateDraft("triggerKeywords", event.target.value)
                      }
                      placeholder="price, buy, demo"
                      disabled={isBusy}
                    />
                    <p className="text-caption text-muted-foreground">
                      {AI_ASSISTANT_MESSAGES.agentTriggersHint}
                    </p>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-medium">
                      {AI_ASSISTANT_MESSAGES.wizardSummaryTitle}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Goal</span>
                        <span className="font-medium">{goalConfig.label}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">AI</span>
                        <span className="text-right font-medium">
                          {billingModeLabel()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Model</span>
                        <span className="text-right font-medium">
                          {AI_PROVIDER_LABELS[draft.provider]} · {draft.model}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Style</span>
                        <span className="font-medium">
                          {getCommunicationStyleLabel(draft.communicationStyle)}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <AiAgentChannelIconRow
                          channels={draft.channels}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-medium">
                      {AI_ASSISTANT_MESSAGES.testMatchTitle}
                    </p>
                    <div className="mt-3 space-y-2">
                      <Input
                        value={routingPreviewMessage}
                        onChange={(event) =>
                          setRoutingPreviewMessage(event.target.value)
                        }
                        placeholder={AI_ASSISTANT_MESSAGES.testMessage}
                        disabled={isBusy}
                      />
                      <p className="text-caption text-muted-foreground">
                        {routingPreviewMessage.trim()
                          ? routingPreview
                            ? AI_ASSISTANT_MESSAGES.testMatchAgent(routingPreview.name)
                            : AI_ASSISTANT_MESSAGES.testMatchFallback
                          : AI_ASSISTANT_MESSAGES.wizardRoutingHint}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          ) : null}

          {step > 1 && !goalConfig ? (
            <div className="text-center text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.wizardPickGoalFirst}
            </div>
          ) : null}
        </div>
      </div>

      {step > 1 ? (
        <footer
          className={cn(
            "shrink-0 border-t bg-background",
            isTestStep ? "px-3 py-2 md:px-4" : "px-4 py-4 md:px-8",
          )}
        >
          <div
            className={cn(
              "mx-auto flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between",
              isTestStep ? "w-full max-w-none" : "max-w-4xl",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={() => {
                if (step === 2) {
                  onStepChange(1, null);
                  return;
                }

                if (step === 3) {
                  onStepChange(2, goal);
                  return;
                }

                if (step === 4) {
                  onStepChange(3, goal);
                  return;
                }

                onStepChange(4, goal);
              }}
              className="gap-2"
            >
              <ArrowLeftIcon className="size-4" />
              {step === 2
                ? AI_ASSISTANT_MESSAGES.wizardBackToGoals
                : step === 3
                  ? AI_ASSISTANT_MESSAGES.wizardBackToChannels
                  : step === 4
                    ? AI_ASSISTANT_MESSAGES.wizardBackToModel
                    : AI_ASSISTANT_MESSAGES.wizardBackToTest}
            </Button>

            {step === 2 ? (
              <Button
                type="button"
                disabled={isBusy || !hasSelectedChannel}
                onClick={() => onStepChange(3, goal)}
                className="gap-2"
              >
                {AI_ASSISTANT_MESSAGES.wizardContinue}
                <ArrowRightIcon className="size-4" />
              </Button>
            ) : null}

            {step === 3 ? (
              <Button
                type="button"
                disabled={isBusy || !modelStepValid}
                onClick={() => void handleContinueFromModelStep()}
                className="gap-2"
              >
                {isSavingKey ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    {AI_ASSISTANT_MESSAGES.wizardStep3SavingKey}
                  </>
                ) : (
                  <>
                    {AI_ASSISTANT_MESSAGES.wizardContinue}
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>
            ) : null}

            {step === 4 ? (
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => onStepChange(5, goal)}
                className="gap-2"
              >
                {AI_ASSISTANT_MESSAGES.wizardContinue}
                <ArrowRightIcon className="size-4" />
              </Button>
            ) : null}

            {step === 5 ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isBusy ||
                    !draft.name.trim() ||
                    draft.channels.length === 0 ||
                    routingConflicts.length > 0
                  }
                  onClick={() => void handleCreate(false)}
                >
                  {AI_ASSISTANT_MESSAGES.wizardCreateDraft}
                </Button>
                <Button
                  type="button"
                  disabled={
                    isBusy ||
                    !draft.name.trim() ||
                    draft.channels.length === 0 ||
                    routingConflicts.length > 0
                  }
                  onClick={() => void handleCreate(true)}
                  className="gap-2"
                >
                  <SparklesIcon className="size-4" />
                  {AI_ASSISTANT_MESSAGES.wizardCreateAndEnable}
                </Button>
              </div>
            ) : null}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
