"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { AiAgentChannelIconRow } from "@/components/ai-assistant/AiAgentChannelIconRow";
import { AiAgentIcon } from "@/components/ai-assistant/AiAgentIcon";
import { AgentPowerToggle } from "@/components/ai-assistant/AgentPowerToggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAiAgentAction } from "@/features/ai-assistant/actions/delete-ai-agent";
import { toggleAiAgentEnabledAction } from "@/features/ai-assistant/actions/toggle-ai-agent-enabled";
import { filterAgentChannelsToConnected } from "@/features/ai-assistant/connected-channels";
import { getCommunicationStyleLabel } from "@/features/ai-assistant/communication-styles";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import { AI_PROVIDER_LABELS, type AiProvider } from "@/lib/ai/constants";
import { getAgentIconLabel } from "@/features/ai-assistant/agent-icons";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentViewPanelProps = {
  agent: AiAgentItem;
  activeChannelFilter: MessagingIntegrationChannelId | null;
  searchQuery: string;
  visibleChannelIds: MessagingIntegrationChannelId[];
  channelStatuses: IntegrationChannelStatusMap;
  showSetupBanner: boolean;
  onEdit: () => void;
  onOpenAnalytics: () => void;
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
  visibleChannelIds,
  channelStatuses,
  showSetupBanner,
  onEdit,
  onOpenAnalytics,
  onBack,
  onDismissSetupBanner,
}: AiAgentViewPanelProps) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

      setDeleteOpen(false);
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
  const visibleChannels = filterAgentChannelsToConnected(
    agent.channels,
    channelStatuses,
    visibleChannelIds,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/20 px-4 py-4">
        {onBack ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}
        <AiAgentIcon iconId={agent.icon} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{agent.name}</p>
          <p className="text-caption text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.agentViewSubtitle}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={AI_ASSISTANT_MESSAGES.agentAnalytics}
          title={AI_ASSISTANT_MESSAGES.agentAnalytics}
          onClick={onOpenAnalytics}
        >
          <BarChart3Icon className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onEdit}>
          <PencilIcon className="size-4" />
          {AI_ASSISTANT_MESSAGES.editAgent}
        </Button>
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
            label={AI_ASSISTANT_MESSAGES.agentIconLabel}
            value={getAgentIconLabel(agent.icon)}
          />
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
            label={AI_ASSISTANT_MESSAGES.communicationStyleLabel}
            value={getCommunicationStyleLabel(agent.communicationStyle)}
          />
          <div className="flex flex-col gap-2 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.agentChannels}
            </span>
            {visibleChannels.length > 0 ? (
              <AiAgentChannelIconRow channels={visibleChannels} size="md" />
            ) : (
              <span className="text-sm font-medium">—</span>
            )}
          </div>
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

        <div className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon className="size-4" />
            {AI_ASSISTANT_MESSAGES.deleteAgent}
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{AI_ASSISTANT_MESSAGES.deleteAgentConfirmTitle}</DialogTitle>
            <DialogDescription>
              {AI_ASSISTANT_MESSAGES.deleteAgentConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
            >
              {AI_ASSISTANT_MESSAGES.deleteAgentConfirmCancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                AI_ASSISTANT_MESSAGES.deleteAgent
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
