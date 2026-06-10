"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AiModelProviderSelect } from "@/components/ai-assistant/AiModelProviderSelect";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAiAgentAction } from "@/features/ai-assistant/actions/create-ai-agent";
import {
  getAgentMarketplaceTemplate,
  resolveTemplateAiConfig,
} from "@/features/ai-assistant/agent-marketplace-catalog";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { getChannelLabel } from "@/features/channel-workspace";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { AiProvider } from "@/lib/ai/constants";
import { cn } from "@/lib/utils";
import type {
  AiProviderAvailability,
  ChannelAiSettingsData,
} from "@/types/channel-workspace.types";
import type { MessagingChannel } from "@/types/database.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentSetupPanelProps = {
  templateId: string;
  activeChannel: MessagingChannel;
  activeChannelFilter: MessagingChannel | null;
  searchQuery: string;
  visibleChannelIds: MessagingChannel[];
  channelDefaults: ChannelAiSettingsData;
  providerAvailability: AiProviderAvailability;
  onBack: () => void;
  onCancel: () => void;
};

const MIN_CREATE_DELAY_MS = 900;

export function AiAgentSetupPanel({
  templateId,
  activeChannel,
  activeChannelFilter,
  searchQuery,
  visibleChannelIds,
  channelDefaults,
  providerAvailability,
  onBack,
  onCancel,
}: AiAgentSetupPanelProps) {
  const router = useRouter();
  const template = getAgentMarketplaceTemplate(templateId);

  const initialAi = useMemo(() => {
    if (!template) {
      return { provider: "gemini" as AiProvider, model: channelDefaults.model };
    }

    return resolveTemplateAiConfig(template, providerAvailability);
  }, [channelDefaults.model, providerAvailability, template]);

  const [name, setName] = useState(template?.draft.name ?? "");
  const [provider, setProvider] = useState<AiProvider>(initialAi.provider);
  const [model, setModel] = useState(initialAi.model);
  const [channels, setChannels] = useState<MessagingChannel[]>(() => {
    if (!template) {
      return [activeChannelFilter ?? activeChannel];
    }

    const visible = template.channels.filter((channel) =>
      visibleChannelIds.includes(channel),
    );

    if (visible.length > 0) {
      return visible;
    }

    return template.channels.length > 0
      ? [template.channels[0]!]
      : [activeChannelFilter ?? activeChannel];
  });
  const [isCreating, setIsCreating] = useState(false);

  const providerReady = providerAvailability[provider];

  const availableChannels = MESSAGING_INTEGRATION_CHANNELS.filter((channel) =>
    visibleChannelIds.includes(channel),
  );

  if (!template) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This agent template was not found.
        </p>
        <Button type="button" variant="outline" onClick={onBack}>
          {AI_ASSISTANT_MESSAGES.setupAgentBack}
        </Button>
      </div>
    );
  }

  const TemplateIcon = template.icon;
  const isVoiceTemplate = template.categoryId === "voice";

  function toggleChannel(channel: MessagingChannel) {
    setChannels((current) => {
      const hasChannel = current.includes(channel);

      if (hasChannel) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== channel);
      }

      return [...current, channel];
    });
  }

  async function handleCreate() {
    if (!template) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Enter an agent name.");
      return;
    }

    setIsCreating(true);
    const startedAt = Date.now();

    try {
      const result = await createAiAgentAction({
        name: trimmedName,
        systemPrompt: template.draft.systemPrompt,
        channels,
        triggerKeywords: template.draft.triggerKeywords,
        enabled: false,
        provider,
        model,
        language: channelDefaults.language,
      });

      const elapsed = Date.now() - startedAt;

      if (elapsed < MIN_CREATE_DELAY_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_CREATE_DELAY_MS - elapsed),
        );
      }

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
          setup: true,
        }),
      );
      router.refresh();
    } catch {
      setIsCreating(false);
      toast.error(AI_ASSISTANT_MESSAGES.saveFailed);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      {isCreating ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/95 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2Icon className="size-6 animate-spin text-primary" />
          </div>
          <p className="text-base font-medium">
            {AI_ASSISTANT_MESSAGES.creatingAgent}
          </p>
          <p className="text-sm text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.creatingAgentHint}
          </p>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0"
              onClick={onBack}
              disabled={isCreating}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                isVoiceTemplate
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                  : "bg-primary/10 text-primary",
              )}
            >
              <TemplateIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {AI_ASSISTANT_MESSAGES.setupAgentTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {template.name} · {template.providerBadge}
              </p>
              <p className="text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.setupAgentDescription}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isCreating}
          >
            {AI_ASSISTANT_MESSAGES.createAgentCancel}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 md:p-6">
        {isVoiceTemplate && template.integrationHref ? (
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">AI Voice integration</CardTitle>
              <CardDescription>
                {AI_ASSISTANT_MESSAGES.setupAgentVoiceHint}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={template.integrationHref}>
                  {template.integrationLabel ??
                    AI_ASSISTANT_MESSAGES.setupAgentConnectVoice}
                  <ExternalLinkIcon className="size-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="setup-agent-name">
            {AI_ASSISTANT_MESSAGES.agentName}
          </Label>
          <Input
            id="setup-agent-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={template.draft.name}
            disabled={isCreating}
            autoFocus
          />
        </div>

        <AiModelProviderSelect
          idPrefix="setup-agent"
          provider={provider}
          model={model}
          providerAvailability={providerAvailability}
          disabled={isCreating}
          onProviderChange={setProvider}
          onModelChange={setModel}
        />

        <div className="space-y-2">
          <Label>{AI_ASSISTANT_MESSAGES.agentChannels}</Label>
          <p className="text-caption text-muted-foreground">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {(availableChannels.length > 0
              ? availableChannels
              : MESSAGING_INTEGRATION_CHANNELS
            ).map((channel) => {
              const isSelected = channels.includes(channel);
              const isRecommended = template.channels.includes(channel);

              return (
                <Button
                  key={channel}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  disabled={isCreating}
                  onClick={() => toggleChannel(channel)}
                  className="gap-2"
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded",
                      getChannelIconContainerClassName(channel),
                    )}
                  >
                    <ChannelBrandIcon channel={channel} className="size-3" />
                  </span>
                  {getChannelLabel(channel)}
                  {isRecommended ? (
                    <span className="text-[10px] opacity-70">· rec.</span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={isCreating}
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeftIcon className="size-4" />
            {AI_ASSISTANT_MESSAGES.setupAgentBack}
          </Button>
          <Button
            type="button"
            disabled={
              isCreating ||
              !name.trim() ||
              channels.length === 0 ||
              !providerReady
            }
            onClick={() => void handleCreate()}
            className="gap-2"
          >
            <SparklesIcon className="size-4" />
            {AI_ASSISTANT_MESSAGES.createAgentSubmit}
          </Button>
        </div>
      </div>
    </div>
  );
}
