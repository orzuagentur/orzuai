"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { getTriggerLabel } from "@/features/automations/workflow-types";
import type { AutomationOpsMetrics } from "@/types/analytics.types";

type AnalyticsAutomationsOpsPanelProps = {
  metrics: AutomationOpsMetrics;
};

export function AnalyticsAutomationsOpsPanel({
  metrics,
}: AnalyticsAutomationsOpsPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {ANALYTICS_MESSAGES.aiOpsAutomationsTitle}
            </CardTitle>
            <CardDescription>
              {ANALYTICS_MESSAGES.aiOpsAutomationsDescription}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
            <Link href={`${DASHBOARD_ROUTES.automations}?tab=activity`}>
              {ANALYTICS_MESSAGES.aiOpsViewAutomations}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.aiOpsRunsToday}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {metrics.runsToday}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.aiOpsRuns30d}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {metrics.runsLast30Days}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.aiOpsSuccessRate}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {metrics.successRatePercent}%
            </p>
          </div>
        </div>

        {metrics.topTriggers.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {metrics.topTriggers.map((trigger) => (
              <li
                key={trigger.triggerType}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span>{getTriggerLabel(trigger.triggerType)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {trigger.count} run{trigger.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.aiOpsAutomationsEmpty}
          </p>
        )}

        {metrics.failedRunsLast30Days > 0 ? (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.aiOpsFailedRuns(metrics.failedRunsLast30Days)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
