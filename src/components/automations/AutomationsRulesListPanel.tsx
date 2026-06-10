"use client";

import Link from "next/link";
import { WorkflowIcon } from "lucide-react";

import { AutomationsChannelBadgeRow } from "@/components/automations/AutomationsChannelBadgeRow";
import { Badge } from "@/components/ui/badge";
import {
  AUTOMATION_RULES,
  isRuleEnabled,
  type AutomationRuleId,
} from "@/features/automations/rule-catalog";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import {
  getActionLabel,
  getTriggerLabel,
  type AutomationWorkflowItem,
} from "@/features/automations/workflow-types";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import { cn } from "@/lib/utils";
import type { SalesAgentSettings } from "@/types/ai-usage.types";
import type { MessagingChannel } from "@/types/database.types";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";
import type { AutomationsTab } from "@/utils/automations-url";
import { buildAutomationsHref } from "@/utils/automations-url";

type AutomationsRulesListPanelProps = {
  activeRuleId: AutomationRuleId | null;
  activeWorkflowId: string | null;
  activeTab: AutomationsTab;
  salesAgent: SalesAgentSettings;
  followUpAgent: FollowUpAgentSettings;
  workflows: AutomationWorkflowItem[];
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingChannel[];
};

export function AutomationsRulesListPanel({
  activeRuleId,
  activeWorkflowId,
  activeTab,
  salesAgent,
  followUpAgent,
  workflows,
  channelStatuses,
  visibleChannelIds,
}: AutomationsRulesListPanelProps) {
  return (
    <div>
      <ul className="divide-y">
        {AUTOMATION_RULES.map((rule) => {
          const enabled = isRuleEnabled(rule.id, salesAgent, followUpAgent);
          const isActive = activeRuleId === rule.id;
          const Icon = rule.icon;

          return (
            <li key={rule.id}>
              <Link
                href={buildAutomationsHref({ tab: "rules", rule: rule.id })}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                  isActive && activeTab === "rules" && "bg-primary/5",
                )}
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{rule.name}</p>
                    <Badge
                      variant={enabled ? "default" : "secondary"}
                      className="shrink-0 text-[10px]"
                    >
                      {enabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rule.triggerSummary} → {rule.actionSummary}
                  </p>
                  <AutomationsChannelBadgeRow
                    channelStatuses={channelStatuses}
                    visibleChannelIds={visibleChannelIds}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground">
          {AUTOMATIONS_MESSAGES.workflowsSection}
        </p>
      </div>

      {workflows.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          {AUTOMATIONS_MESSAGES.workflowsEmpty}
        </p>
      ) : (
        <ul className="divide-y">
          {workflows.map((workflow) => {
            const isActive = activeWorkflowId === workflow.id;
            const workflowChannels =
              workflow.config.channels.length > 0
                ? workflow.config.channels
                : visibleChannelIds;

            return (
              <li key={workflow.id}>
                <Link
                  href={buildAutomationsHref({
                    tab: "rules",
                    workflow: workflow.id,
                  })}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                    isActive && activeTab === "rules" && "bg-primary/5",
                  )}
                >
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                    <WorkflowIcon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{workflow.name}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {AUTOMATIONS_MESSAGES.customBadge}
                      </Badge>
                      <Badge
                        variant={workflow.enabled ? "default" : "secondary"}
                        className="shrink-0 text-[10px]"
                      >
                        {workflow.enabled ? "On" : "Off"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getTriggerLabel(workflow.triggerType)} →{" "}
                      {getActionLabel(workflow.actionType)}
                    </p>
                    <AutomationsChannelBadgeRow
                      channelStatuses={channelStatuses}
                      visibleChannelIds={workflowChannels}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
