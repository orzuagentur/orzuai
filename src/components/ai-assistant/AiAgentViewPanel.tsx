"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { AgentPowerToggle } from "@/components/ai-assistant/AgentPowerToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteAiAgentAction } from "@/features/ai-assistant/actions/delete-ai-agent";
import { toggleAiAgentEnabledAction } from "@/features/ai-assistant/actions/toggle-ai-agent-enabled";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { AI_PROVIDER_LABELS, type AiProvider } from "@/lib/ai/constants";
import { getChannelLabel } from "@/features/channel-workspace";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingChannel } from "@/types/database.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentViewPanelProps = {
  agent: AiAgentItem;
  activeChannelFilter: MessagingChannel | null;
  searchQuery: string;
  showSetupBanner: boolean;
  onEdit: () => void;
  onBack?: () => void;
  onDismissSetupBanner: () => void;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium sm:max-w-[65%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

export function AiAgentViewPanel({
  agent,
  activeChannelFilter,
  searchQuery,
  showSetupBanner,
  onEdit,
  onBack,
  onDismissSetupBanner,
}: AiAgentViewPanelProps) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [enabled, setEnabled] = useState(agent.enabled);

  useEffect(() => {
    setEnabled(agent.enabled);
  }, [agent.enabled, agent.id]);

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

      setEnabled(nextEnabled);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteAiAgentAction({ id: agent.id });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.agentDeleted);
      router.push(
        buildAiAssistantHref({
          channel: activeChannelFilter,
          tab: "agents",
          q: searchQuery || null,
        }),
      );
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const providerLabel =
    AI_PROVIDER_LABELS[agent.provider as AiProvider] ?? agent.provider;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/20 px-4 py-4">
        {onBack ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{agent.name}</p>
          <p className="text-caption text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.agentViewSubtitle}
          </p>
        </div>
        <AgentPowerToggle
          enabled={enabled}
          disabled={isToggling}
          onChange={(value) => void handleTogglePower(value)}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        {showSetupBanner ? (
          <div className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {AI_ASSISTANT_MESSAGES.agentCreatedBannerTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.agentCreatedBannerDescription}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismissSetupBanner}
            >
              OK
            </Button>
          </div>
        ) : null}

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold">
            {AI_ASSISTANT_MESSAGES.agentSavedSettingsTitle}
          </h3>
          <p className="mb-2 text-caption text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.agentSavedSettingsHint}
          </p>

          <SummaryRow label={AI_ASSISTANT_MESSAGES.agentName} value={agent.name} />
          <SummaryRow
            label={AI_ASSISTANT_MESSAGES.agentStatus}
            value={
              enabled
                ? AI_ASSISTANT_MESSAGES.agentEnabled
                : AI_ASSISTANT_MESSAGES.agentDisabled
            }
          />
          <SummaryRow
            label={AI_ASSISTANT_MESSAGES.aiProviderLabel}
            value={providerLabel}
          />
          <SummaryRow label={AI_ASSISTANT_MESSAGES.aiModelLabel} value={agent.model} />
          <SummaryRow
            label={AI_ASSISTANT_MESSAGES.aiLanguageLabel}
            value={agent.language}
          />
          <SummaryRow
            label={AI_ASSISTANT_MESSAGES.agentChannels}
            value={agent.channels.map(getChannelLabel).join(", ")}
          />
          <SummaryRow
            label={AI_ASSISTANT_MESSAGES.agentTriggers}
            value={
              agent.triggerKeywords.length > 0
                ? agent.triggerKeywords.join(", ")
                : AI_ASSISTANT_MESSAGES.agentDefaultRouting
            }
          />
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">
            {AI_ASSISTANT_MESSAGES.sectionInstructions}
          </h3>
          <p className="whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm leading-relaxed">
            {agent.systemPrompt}
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          {agent.channels.map((channel) => (
            <Badge key={channel} variant="secondary">
              {getChannelLabel(channel)}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="button" className="gap-2" onClick={onEdit}>
            <PencilIcon className="size-4" />
            {AI_ASSISTANT_MESSAGES.editAgent}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
          >
            <Trash2Icon className="size-4" />
            {AI_ASSISTANT_MESSAGES.deleteAgent}
          </Button>
        </div>
      </div>
    </div>
  );
}
