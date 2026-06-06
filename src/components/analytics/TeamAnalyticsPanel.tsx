"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { TeamAnalyticsMetrics } from "@/types/dashboard.types";

type TeamAnalyticsPanelProps = {
  metrics: TeamAnalyticsMetrics;
};

export function TeamAnalyticsPanel({ metrics }: TeamAnalyticsPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.teamTitle}
        </CardTitle>
        <CardDescription>{ANALYTICS_MESSAGES.teamDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.teamReplies}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {metrics.teamReplies}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.slaCompliance}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {metrics.slaCompliancePercent}%
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {metrics.aiReplies} AI replies · {metrics.clientMessages} customer
          messages · SLA target {metrics.slaTargetMinutes} min first response
        </p>
      </CardContent>
    </Card>
  );
}
