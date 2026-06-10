"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AgentConnectedChannelSelect } from "@/components/ai-assistant/AgentConnectedChannelSelect";
import { AgentRoutingConflictBanner } from "@/components/ai-assistant/AgentRoutingConflictBanner";
import { AiAgentIconPicker } from "@/components/ai-assistant/AiAgentIconPicker";
import { AiCommunicationStyleSelect } from "@/components/ai-assistant/AiCommunicationStyleSelect";
import { AiModelProviderSelect } from "@/components/ai-assistant/AiModelProviderSelect";
import { AgentPowerToggle } from "@/components/ai-assistant/AgentPowerToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toggleAiAgentEnabledAction } from "@/features/ai-assistant/actions/toggle-ai-agent-enabled";
import { updateAiAgentAction } from "@/features/ai-assistant/actions/update-ai-agent";
import { filterAgentChannelsToConnected } from "@/features/ai-assistant/connected-channels";
import {
  resolveAgentIconId,
  type AgentIconId,
} from "@/features/ai-assistant/agent-icons";
import {
  DEFAULT_COMMUNICATION_STYLE,
  isCommunicationStyleId,
  type CommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";
import {
  findDefaultAgentConflicts,
  parseTriggerKeywordsInput,
} from "@/features/ai-assistant/agent-channel-routing";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import {
  resolveAiModel,
  type AiProvider,
} from "@/lib/ai/constants";
import type { BusinessProviderCredential } from "@/services/business-ai-credentials.service";
import type { AiProviderAvailability } from "@/types/channel-workspace.types";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingChannel } from "@/types/database.types";
import { AI_LANGUAGE_OPTIONS } from "@/types/channel-workspace.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";
import { resolveAgentMatch } from "@/utils/ai-agent-routing";

type DraftState = {
  name: string;
  systemPrompt: string;
  channels: MessagingChannel[];
  triggerKeywords: string;
  enabled: boolean;
  provider: AiProvider;
  model: string;
  language: string;
  communicationStyle: CommunicationStyleId;
  icon: AgentIconId;
  useCustomModel: boolean;
};

type AiAgentEditPanelProps = {
  agent: AiAgentItem;
  activeChannel: MessagingChannel;
  activeChannelFilter: MessagingChannel | null;
  searchQuery: string;
  allAgents: AiAgentItem[];
  visibleChannelIds: MessagingChannel[];
  channelStatuses: IntegrationChannelStatusMap;
  providerAvailability: AiProviderAvailability;
  platformProviderAvailability: AiProviderAvailability;
  businessProviderCredentials: BusinessProviderCredential[];
  onCancel: () => void;
  onBack?: () => void;
};

function buildDraft(
  agent: AiAgentItem,
  channelStatuses: IntegrationChannelStatusMap,
  visibleChannelIds: MessagingChannel[],
): DraftState {
  const provider = (agent.provider as AiProvider) ?? "gemini";
  const communicationStyle = isCommunicationStyleId(agent.communicationStyle)
    ? agent.communicationStyle
    : DEFAULT_COMMUNICATION_STYLE;

  return {
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    channels: filterAgentChannelsToConnected(
      agent.channels,
      channelStatuses,
      visibleChannelIds,
    ),
    triggerKeywords: agent.triggerKeywords.join(", "),
    enabled: agent.enabled,
    provider,
    model: agent.useCustomModel
      ? agent.model
      : resolveAiModel(provider, agent.model),
    language: agent.language,
    communicationStyle,
    icon: resolveAgentIconId(agent.icon),
    useCustomModel: agent.useCustomModel,
  };
}

export function AiAgentEditPanel({
  agent,
  activeChannel,
  activeChannelFilter,
  searchQuery,
  allAgents,
  visibleChannelIds,
  channelStatuses,
  providerAvailability,
  platformProviderAvailability,
  businessProviderCredentials,
  onCancel,
  onBack,
}: AiAgentEditPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(() =>
    buildDraft(agent, channelStatuses, visibleChannelIds),
  );
  const [testMessage, setTestMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setDraft(buildDraft(agent, channelStatuses, visibleChannelIds));
  }, [agent, channelStatuses, visibleChannelIds]);

  const routingConflicts = useMemo(
    () =>
      findDefaultAgentConflicts(allAgents, {
        id: agent.id,
        channels: draft.channels,
        triggerKeywords: parseTriggerKeywordsInput(draft.triggerKeywords),
      }),
    [agent.id, allAgents, draft.channels, draft.triggerKeywords],
  );

  const previewChannel = activeChannelFilter ?? activeChannel;
  const previewAgent = useMemo(() => {
    const keywords = draft.triggerKeywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    const candidate: AiAgentItem = {
      ...agent,
      name: draft.name,
      systemPrompt: draft.systemPrompt,
      channels: draft.channels,
      triggerKeywords: keywords,
      enabled: draft.enabled,
      provider: draft.provider,
      model: draft.model,
      language: draft.language,
      communicationStyle: draft.communicationStyle,
      icon: draft.icon,
      useCustomModel: draft.useCustomModel,
    };

    const others = allAgents.filter((item) => item.id !== agent.id);

    return resolveAgentMatch({
      agents: draft.enabled ? [candidate, ...others] : others,
      channel: previewChannel,
      message: testMessage,
    });
  }, [agent, allAgents, draft, previewChannel, testMessage]);

  function toggleChannel(channel: MessagingChannel) {
    setDraft((value) => {
      const hasChannel = value.channels.includes(channel);

      return {
        ...value,
        channels: hasChannel
          ? value.channels.filter((item) => item !== channel)
          : [...value.channels, channel],
      };
    });
  }

  async function handleTogglePower(nextEnabled: boolean) {
    setIsToggling(true);

    try {
      const result = await toggleAiAgentEnabledAction({
        id: agent.id,
        enabled: nextEnabled,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      setDraft((value) => ({ ...value, enabled: nextEnabled }));
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await updateAiAgentAction({
        id: agent.id,
        name: draft.name,
        systemPrompt: draft.systemPrompt,
        channels: draft.channels,
        triggerKeywords: draft.triggerKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        enabled: draft.enabled,
        provider: draft.provider,
        model: draft.model,
        language: draft.language,
        communicationStyle: draft.communicationStyle,
        icon: draft.icon,
        useCustomModel: draft.useCustomModel,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.agentUpdated);
      router.push(
        buildAiAssistantHref({
          channel: activeChannelFilter,
          tab: "agents",
          agent: agent.id,
          q: searchQuery || null,
          edit: false,
          setup: false,
        }),
      );
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  const providerReady = providerAvailability[draft.provider];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/20 px-4 py-4">
        {onBack ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">
            {AI_ASSISTANT_MESSAGES.editAgentTitle}
          </p>
          <p className="text-caption text-muted-foreground">{draft.name}</p>
        </div>
        <AgentPowerToggle
          enabled={draft.enabled}
          disabled={isToggling}
          onChange={(value) => void handleTogglePower(value)}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold">
              {AI_ASSISTANT_MESSAGES.sectionAiModel}
            </h3>
            <p className="text-caption text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.sectionAiModelHint}
            </p>
          </div>

          <AiModelProviderSelect
            idPrefix={`agent-${agent.id}`}
            provider={draft.provider}
            model={draft.model}
            providerAvailability={providerAvailability}
            platformAvailability={platformProviderAvailability}
            businessCredentials={businessProviderCredentials}
            useCustomModel={draft.useCustomModel}
            disabled={isSaving}
            onProviderChange={(provider) =>
              setDraft((value) => ({ ...value, provider }))
            }
            onModelChange={(model) =>
              setDraft((value) => ({ ...value, model }))
            }
            onUseCustomModelChange={(useCustomModel) =>
              setDraft((value) => ({ ...value, useCustomModel }))
            }
          />

          <div className="space-y-2">
            <Label htmlFor={`agent-${agent.id}-language`}>
              {AI_ASSISTANT_MESSAGES.aiLanguageLabel}
            </Label>
            <select
              id={`agent-${agent.id}-language`}
              className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={draft.language}
              onChange={(event) =>
                setDraft((value) => ({ ...value, language: event.target.value }))
              }
            >
              {AI_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold">
              {AI_ASSISTANT_MESSAGES.sectionInstructions}
            </h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`agent-${agent.id}-name`}>
              {AI_ASSISTANT_MESSAGES.agentName}
            </Label>
            <Input
              id={`agent-${agent.id}-name`}
              value={draft.name}
              onChange={(event) =>
                setDraft((value) => ({ ...value, name: event.target.value }))
              }
            />
          </div>

          <AiAgentIconPicker
            value={draft.icon}
            disabled={isSaving}
            onChange={(icon) => setDraft((value) => ({ ...value, icon }))}
          />

          <div className="space-y-2">
            <Label htmlFor={`agent-${agent.id}-prompt`}>
              {AI_ASSISTANT_MESSAGES.agentPrompt}
            </Label>
            <Textarea
              id={`agent-${agent.id}-prompt`}
              value={draft.systemPrompt}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  systemPrompt: event.target.value,
                }))
              }
              rows={8}
              className="min-h-[10rem] font-mono text-sm"
            />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">
            {AI_ASSISTANT_MESSAGES.sectionRouting}
          </h3>

          <AiCommunicationStyleSelect
            value={draft.communicationStyle}
            disabled={isSaving}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                communicationStyle: value,
              }))
            }
          />

          <AgentConnectedChannelSelect
            selectedChannels={draft.channels}
            visibleChannelIds={visibleChannelIds}
            channelStatuses={channelStatuses}
            disabled={isSaving}
            onToggle={toggleChannel}
          />

          <AgentRoutingConflictBanner conflicts={routingConflicts} />

          <div className="space-y-2">
            <Label htmlFor={`agent-${agent.id}-triggers`}>
              {AI_ASSISTANT_MESSAGES.agentTriggers}
            </Label>
            <Input
              id={`agent-${agent.id}-triggers`}
              value={draft.triggerKeywords}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  triggerKeywords: event.target.value,
                }))
              }
              placeholder="price, demo, book"
            />
            <p className="text-caption text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.agentTriggersHint}
            </p>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">
              {AI_ASSISTANT_MESSAGES.testMatchTitle}
            </p>
            <Input
              value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
              placeholder={AI_ASSISTANT_MESSAGES.testMessage}
            />
            <p className="text-sm text-muted-foreground">
              {previewAgent && testMessage.trim()
                ? AI_ASSISTANT_MESSAGES.testMatchAgent(previewAgent.name)
                : AI_ASSISTANT_MESSAGES.testMatchFallback}
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            type="button"
            size="lg"
            disabled={
              isSaving ||
              !draft.name.trim() ||
              !draft.systemPrompt.trim() ||
              draft.channels.length === 0 ||
              !providerReady ||
              (draft.useCustomModel && !draft.model.trim()) ||
              routingConflicts.length > 0
            }
            onClick={() => void handleSave()}
          >
            {isSaving ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {AI_ASSISTANT_MESSAGES.save}
              </>
            ) : (
              AI_ASSISTANT_MESSAGES.agentSave
            )}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            {AI_ASSISTANT_MESSAGES.editCancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
