"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getChannelLabel } from "@/features/channel-workspace";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { AgentRunListItem, AgentRunsMetrics } from "@/types/analytics.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatRelativeTime } from "@/utils/dashboard";

type AnalyticsAgentRunsPanelProps = {
  metrics: AgentRunsMetrics;
  recentRuns: AgentRunListItem[];
};

function routingMethodLabel(method: string | null): string {
  if (method === "intent") {
    return ANALYTICS_MESSAGES.aiOpsAgentRunsRouteIntent;
  }

  if (method === "keyword") {
    return ANALYTICS_MESSAGES.aiOpsAgentRunsRouteKeyword;
  }

  return ANALYTICS_MESSAGES.aiOpsAgentRunsRouteAssistant;
}

function routingMethodVariant(
  method: string | null,
): "default" | "secondary" | "outline" {
  if (method === "intent") {
    return "default";
  }

  if (method === "keyword") {
    return "secondary";
  }

  return "outline";
}

export function AnalyticsAgentRunsPanel({
  metrics,
  recentRuns,
}: AnalyticsAgentRunsPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {ANALYTICS_MESSAGES.aiOpsAgentRunsTitle}
            </CardTitle>
            <CardDescription>
              {ANALYTICS_MESSAGES.aiOpsAgentRunsDescription}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
            <Link href={buildAiAssistantHref({ section: "assistant" })}>
              {ANALYTICS_MESSAGES.aiOpsViewAiAssistant}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              {ANALYTICS_MESSAGES.aiOpsAgentRunsActions30d}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {metrics.actionsAppliedLast30Days}
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

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            Blocked: {metrics.blockedActionsLast30Days}
          </span>
          <span>·</span>
          <span>
            Duplicate skips: {metrics.skippedDuplicatesLast30Days}
          </span>
          <span>·</span>
          <span>
            Booking failures: {metrics.bookingFailuresLast30Days}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            {ANALYTICS_MESSAGES.aiOpsAgentRunsIntentCount(
              metrics.intentRoutesLast30Days,
            )}
          </span>
          <span>·</span>
          <span>
            {ANALYTICS_MESSAGES.aiOpsAgentRunsKeywordCount(
              metrics.keywordRoutesLast30Days,
            )}
          </span>
          <span>·</span>
          <span>
            {ANALYTICS_MESSAGES.aiOpsAgentRunsAssistantCount(
              metrics.assistantOnlyLast30Days,
            )}
          </span>
        </div>

        {recentRuns.length > 0 ? (
          <ul className="space-y-2">
            {recentRuns.map((run) => (
              <li
                key={run.id}
                className="rounded-lg border px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={routingMethodVariant(run.routingMethod)}>
                        {routingMethodLabel(run.routingMethod)}
                      </Badge>
                      {!run.success ? (
                        <Badge variant="destructive">
                          {ANALYTICS_MESSAGES.aiOpsAgentRunsFailed}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {getChannelLabel(run.channel)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(run.createdAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {run.messagePreview}
                      {run.messagePreview.length >= 120 ? "…" : ""}
                    </p>
                    {run.actions.length > 0 ? (
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {run.actions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {ANALYTICS_MESSAGES.aiOpsAgentRunsNoActions}
                      </p>
                    )}
                    {run.errorMessage ? (
                      <p className="text-xs text-destructive">{run.errorMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    {run.agentName ? (
                      <span className="font-medium">{run.agentName}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {ANALYTICS_MESSAGES.aiOpsAgentRunsAssistantOnly}
                      </span>
                    )}
                    {run.contactId ? (
                      <Link
                        href={buildContactsHref({
                          contact: run.contactId,
                          profile: true,
                        })}
                        className="text-primary hover:underline"
                      >
                        {run.contactName ?? ANALYTICS_MESSAGES.aiOpsAgentRunsViewContact}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.aiOpsAgentRunsEmpty}
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
