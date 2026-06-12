"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, Trash2Icon, WorkflowIcon } from "lucide-react";
import { toast } from "sonner";

import { AutomationsChannelBadgeRow } from "@/components/automations/AutomationsChannelBadgeRow";
import { AutomationOnOffControl } from "@/components/automations/AutomationOnOffControl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteAutomationWorkflowAction } from "@/features/automations/actions/delete-automation-workflow";
import { toggleAutomationWorkflowAction } from "@/features/automations/actions/toggle-automation-workflow";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import {
  getActionLabel,
  getTriggerLabel,
  type AutomationWorkflowItem,
} from "@/features/automations/workflow-types";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { buildAutomationsHref } from "@/utils/automations-url";

type AutomationWorkflowDetailPanelProps = {
  workflow: AutomationWorkflowItem;
  agents: AiAgentItem[];
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingIntegrationChannelId[];
  onBack?: () => void;
};

export function AutomationWorkflowDetailPanel({
  workflow,
  agents,
  channelStatuses,
  visibleChannelIds,
  onBack,
}: AutomationWorkflowDetailPanelProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(workflow.enabled);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedChannels =
    workflow.config.channels.length > 0
      ? workflow.config.channels
      : visibleChannelIds;

  const agentName =
    workflow.config.aiAgentId != null
      ? agents.find((agent) => agent.id === workflow.config.aiAgentId)?.name
      : null;

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setIsToggling(true);

    try {
      const result = await toggleAutomationWorkflowAction(workflow.id, next);

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.workflowToggleFailed);
        setEnabled(workflow.enabled);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.ruleSaved);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${workflow.name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteAutomationWorkflowAction(workflow.id);

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.saveFailed);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.workflowDeleted);
      router.push(buildAutomationsHref({ tab: "rules" }));
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 lg:hidden"
            onClick={onBack}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
          <WorkflowIcon className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{workflow.name}</h2>
            <Badge variant="outline" className="text-[10px]">
              {AUTOMATIONS_MESSAGES.customBadge}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {AUTOMATIONS_MESSAGES.workflowDetailIntro}
          </p>
        </div>
        <AutomationOnOffControl
          enabled={enabled}
          disabled={isToggling}
          onChange={(next) => void handleToggle(next)}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">When:</span>{" "}
            {getTriggerLabel(workflow.triggerType)}
          </p>
          <p>
            <span className="text-muted-foreground">Then:</span>{" "}
            {getActionLabel(workflow.actionType)}
          </p>
          {workflow.config.tagName ? (
            <p>
              <span className="text-muted-foreground">Tag:</span>{" "}
              {workflow.config.tagName}
            </p>
          ) : null}
          {workflow.config.pipelineStage ? (
            <p>
              <span className="text-muted-foreground">Stage:</span>{" "}
              {workflow.config.pipelineStage}
            </p>
          ) : null}
          {workflow.config.taskTitle ? (
            <p>
              <span className="text-muted-foreground">Task:</span>{" "}
              {workflow.config.taskTitle}
            </p>
          ) : null}
          {workflow.config.notifyTitle ? (
            <p>
              <span className="text-muted-foreground">Notify:</span>{" "}
              {workflow.config.notifyTitle}
            </p>
          ) : null}
          {agentName ? (
            <p>
              <span className="text-muted-foreground">Agent:</span> {agentName}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{AUTOMATIONS_MESSAGES.channelsLabel}</p>
          <AutomationsChannelBadgeRow
            channelStatuses={channelStatuses}
            visibleChannelIds={selectedChannels}
          />
          {workflow.config.channels.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {AUTOMATIONS_MESSAGES.workflowChannelsHint}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t px-4 py-3">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isDeleting}
          onClick={() => void handleDelete()}
        >
          <Trash2Icon className="size-4" />
          {AUTOMATIONS_MESSAGES.workflowDelete}
        </Button>
      </div>
    </div>
  );
}
