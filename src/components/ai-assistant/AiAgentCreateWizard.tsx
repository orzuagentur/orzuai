"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AgentConnectedChannelSelect } from "@/components/ai-assistant/AgentConnectedChannelSelect";
import { AiAgentChannelIconRow } from "@/components/ai-assistant/AiAgentChannelIconRow";
import { AiAgentIconPicker } from "@/components/ai-assistant/AiAgentIconPicker";
import { AiCommunicationStyleSelect } from "@/components/ai-assistant/AiCommunicationStyleSelect";
import { AiModelProviderSelect } from "@/components/ai-assistant/AiModelProviderSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAiAgentAction } from "@/features/ai-assistant/actions/create-ai-agent";
import {
  AGENT_WIZARD_GOALS,
  AGENT_WIZARD_STEPS,
  getAgentWizardGoal,
  resolveGoalAiConfig,
  type AgentWizardGoalId,
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
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import {
  AI_PROVIDER_LABELS,
  type AiProvider,
} from "@/lib/ai/constants";
import { cn } from "@/lib/utils";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type {
  AiProviderAvailability,
  ChannelAiSettingsData,
} from "@/types/channel-workspace.types";
import type { MessagingChannel } from "@/types/database.types";
import { resolveAgentMatch } from "@/utils/ai-agent-routing";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentCreateWizardProps = {
  step: 1 | 2 | 3;
  goal: AgentWizardGoalId | null;
  activeChannel: MessagingChannel;
  activeChannelFilter: MessagingChannel | null;
  searchQuery: string;
  visibleChannelIds: MessagingChannel[];
  channelStatuses: IntegrationChannelStatusMap;
  channelDefaults: ChannelAiSettingsData;
  providerAvailability: AiProviderAvailability;
  onStepChange: (step: 1 | 2 | 3, goal?: AgentWizardGoalId | null) => void;
  onCancel: () => void;
};

type WizardDraft = {
  name: string;
  systemPrompt: string;
  triggerKeywords: string;
  channels: MessagingChannel[];
  provider: AiProvider;
  model: string;
  communicationStyle: CommunicationStyleId;
  icon: AgentIconId;
};

function defaultConnectedChannels(
  channelStatuses: IntegrationChannelStatusMap,
  visibleChannelIds: MessagingChannel[],
): MessagingChannel[] {
  return getConnectedMessagingChannels(channelStatuses, visibleChannelIds);
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
    provider: "gemini",
    model: channelDefaults.model,
    communicationStyle: DEFAULT_COMMUNICATION_STYLE,
    icon: DEFAULT_AGENT_ICON,
  }));
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!goalConfig || !goal) {
      return;
    }

    if (initializedGoalRef.current === goal) {
      return;
    }

    const ai = resolveGoalAiConfig(goalConfig, providerAvailability);

    initializedGoalRef.current = goal;
    setDraft({
      name: goalConfig.draft.name,
      systemPrompt: goalConfig.draft.systemPrompt,
      triggerKeywords: goalConfig.draft.triggerKeywords.join(", "),
      channels: defaultConnectedChannels(channelStatuses, visibleChannelIds),
      provider: ai.provider,
      model: ai.model,
      communicationStyle: DEFAULT_COMMUNICATION_STYLE,
      icon: goalConfig.iconId,
    });
    setShowAdvancedAi(false);
    setTestMessage("");
  }, [channelStatuses, goal, goalConfig, providerAvailability, visibleChannelIds]);

  const previewChannel =
    draft.channels[0] ?? activeChannelFilter ?? activeChannel;

  const routingPreview = useMemo(() => {
    if (!testMessage.trim() || !goalConfig) {
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
      provider: draft.provider,
      model: draft.model,
      language: channelDefaults.language,
      communicationStyle: draft.communicationStyle,
      icon: draft.icon,
      createdAt: "",
      updatedAt: "",
    };

    return resolveAgentMatch({
      agents: [candidate],
      channel: previewChannel,
      message: testMessage,
    });
  }, [
    channelDefaults.language,
    draft,
    goalConfig,
    previewChannel,
    testMessage,
  ]);

  const providerReady = providerAvailability[draft.provider];

  const hasSelectedChannel = draft.channels.length > 0;

  function updateDraft<K extends keyof WizardDraft>(
    key: K,
    value: WizardDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleChannel(channel: MessagingChannel) {
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

    if (!providerReady) {
      toast.error("Configure an AI provider before creating the agent.");
      return;
    }

    setIsCreating(true);

    try {
      const result = await createAiAgentAction({
        name: trimmedName,
        systemPrompt: draft.systemPrompt.trim(),
        channels: draft.channels,
        triggerKeywords: draft.triggerKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        enabled: enableAfterCreate,
        provider: draft.provider,
        model: draft.model,
        language: channelDefaults.language,
        communicationStyle: draft.communicationStyle,
        icon: draft.icon,
      });

      if (!result.success) {
        toast.error(result.error.message);
        setIsCreating(false);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.agentSaved);

      router.push(
        buildAiAssistantHref({
          channel: activeChannelFilter,
          tab: "agents",
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

      <header className="shrink-0 border-b px-4 py-4 md:px-8">
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
            disabled={isCreating}
            aria-label={AI_ASSISTANT_MESSAGES.createAgentCancel}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="mx-auto mt-6 flex max-w-4xl items-center gap-2">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">
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

              <div className="grid gap-4 sm:grid-cols-2">
                {AGENT_WIZARD_GOALS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={isCreating}
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
                disabled={isCreating}
                onToggle={toggleChannel}
              />
            </section>
          ) : null}

          {step === 3 && goalConfig ? (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-medium">
                  {AI_ASSISTANT_MESSAGES.wizardStep3Title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.wizardStep3Description}
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
                      disabled={isCreating}
                    />
                  </div>

                  <AiAgentIconPicker
                    value={draft.icon}
                    disabled={isCreating}
                    onChange={(icon) => updateDraft("icon", icon)}
                  />

                  <AiCommunicationStyleSelect
                    value={draft.communicationStyle}
                    disabled={isCreating}
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
                      disabled={isCreating}
                    />
                  </div>

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
                      disabled={isCreating}
                    />
                    <p className="text-caption text-muted-foreground">
                      {AI_ASSISTANT_MESSAGES.agentTriggersHint}
                    </p>
                  </div>

                  <div className="rounded-xl border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => setShowAdvancedAi((value) => !value)}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {AI_ASSISTANT_MESSAGES.wizardAdvancedAi}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {AI_PROVIDER_LABELS[draft.provider]} · {draft.model}
                        </p>
                      </div>
                      {showAdvancedAi ? (
                        <ChevronUpIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    {showAdvancedAi ? (
                      <div className="border-t px-4 pb-4 pt-2">
                        <AiModelProviderSelect
                          idPrefix="wizard-agent"
                          provider={draft.provider}
                          model={draft.model}
                          providerAvailability={providerAvailability}
                          disabled={isCreating}
                          onProviderChange={(value) =>
                            updateDraft("provider", value)
                          }
                          onModelChange={(value) => updateDraft("model", value)}
                        />
                      </div>
                    ) : null}
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
                        value={testMessage}
                        onChange={(event) => setTestMessage(event.target.value)}
                        placeholder={AI_ASSISTANT_MESSAGES.testMessage}
                        disabled={isCreating}
                      />
                      <p className="text-caption text-muted-foreground">
                        {testMessage.trim()
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

          {step === 2 && !goalConfig ? (
            <div className="text-center text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.wizardPickGoalFirst}
            </div>
          ) : null}

          {step === 3 && !goalConfig ? (
            <div className="text-center text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.wizardPickGoalFirst}
            </div>
          ) : null}
        </div>
      </div>

      {step > 1 ? (
        <footer className="shrink-0 border-t bg-background px-4 py-4 md:px-8">
          <div className="mx-auto flex max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={isCreating}
              onClick={() =>
                onStepChange(
                  step === 3 ? 2 : 1,
                  step === 3 ? goal : null,
                )
              }
              className="gap-2"
            >
              <ArrowLeftIcon className="size-4" />
              {step === 2
                ? AI_ASSISTANT_MESSAGES.wizardBackToGoals
                : AI_ASSISTANT_MESSAGES.wizardBackToChannels}
            </Button>

            {step === 2 ? (
              <Button
                type="button"
                disabled={isCreating || !hasSelectedChannel}
                onClick={() => onStepChange(3, goal)}
                className="gap-2"
              >
                {AI_ASSISTANT_MESSAGES.wizardContinue}
                <ArrowRightIcon className="size-4" />
              </Button>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isCreating ||
                    !draft.name.trim() ||
                    draft.channels.length === 0 ||
                    !providerReady
                  }
                  onClick={() => void handleCreate(false)}
                >
                  {AI_ASSISTANT_MESSAGES.wizardCreateDraft}
                </Button>
                <Button
                  type="button"
                  disabled={
                    isCreating ||
                    !draft.name.trim() ||
                    draft.channels.length === 0 ||
                    !providerReady
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
