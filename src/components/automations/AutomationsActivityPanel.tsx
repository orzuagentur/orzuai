"use client";

import { Clock3Icon, KanbanIcon, ListTodoIcon, WorkflowIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AutomationActivityItem } from "@/types/automations.types";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import { buildAutomationsHref } from "@/utils/automations-url";
import { formatRelativeTime } from "@/utils/dashboard";

type AutomationsActivityPanelProps = {
  activity: AutomationActivityItem[];
};

function activityBadge(type: AutomationActivityItem["type"]) {
  switch (type) {
    case "follow_up_sent":
      return {
        label: AUTOMATIONS_MESSAGES.activityFollowUp,
        icon: Clock3Icon,
      };
    case "crm_task_created":
      return {
        label: AUTOMATIONS_MESSAGES.activityTask,
        icon: ListTodoIcon,
      };
    case "contact_qualified":
      return {
        label: AUTOMATIONS_MESSAGES.activityQualified,
        icon: KanbanIcon,
      };
    case "workflow_run":
      return {
        label: AUTOMATIONS_MESSAGES.activityWorkflow,
        icon: WorkflowIcon,
      };
  }
}

export function AutomationsActivityPanel({
  activity,
}: AutomationsActivityPanelProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold">
          {AUTOMATIONS_MESSAGES.activityTitle}
        </h2>
      </div>

      {activity.length === 0 ? (
        <EmptyState
          variant="generic"
          title={AUTOMATIONS_MESSAGES.emptyActivityTitle}
          description={AUTOMATIONS_MESSAGES.emptyActivityDescription}
          actionLabel={AUTOMATIONS_MESSAGES.tabOverview}
          actionHref={buildAutomationsHref({ tab: "overview" })}
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {activity.map((item) => {
            const badge = activityBadge(item.type);
            const Icon = badge.icon;

            return (
              <li
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 text-sm"
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {badge.label}
                    </Badge>
                  </div>
                  {item.detail ? (
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.occurredAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
