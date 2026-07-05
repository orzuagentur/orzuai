"use client";

import Link from "next/link";
import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  CopyIcon,
  ListChecksIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getChannelLabel } from "@/features/channel-workspace";
import {
  classifyAgentRunActions,
} from "@/lib/ai/agent-run-actions";
import { cn } from "@/lib/utils";
import type { AgentRunListItem, AgentRunsMetrics } from "@/types/analytics.types";
import { buildContactsHref } from "@/utils/contacts-url";
import { formatRelativeTime } from "@/utils/dashboard";

type AiAgentOpsPanelProps = {
  metrics: AgentRunsMetrics;
  recentRuns: AgentRunListItem[];
};

function actionBadgeClass(kind: string): string {
  switch (kind) {
    case "planned":
      return "bg-sky-100 text-sky-900 hover:bg-sky-100";
    case "executed":
      return "bg-emerald-100 text-emerald-900 hover:bg-emerald-100";
    case "blocked":
      return "bg-amber-100 text-amber-900 hover:bg-amber-100";
    case "skipped":
      return "bg-violet-100 text-violet-900 hover:bg-violet-100";
    case "failed":
      return "bg-red-100 text-red-900 hover:bg-red-100";
    default:
      return "";
  }
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof ListChecksIcon;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AiAgentOpsPanel({ metrics, recentRuns }: AiAgentOpsPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">AI worker activity</CardTitle>
            <CardDescription>
              Planned vs executed CRM actions, permission blocks, duplicate skips,
              and booking failures from the last 30 days.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`${DASHBOARD_ROUTES.analytics}?tab=ai_ops`}>
              Full analytics
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Runs (30d)"
            value={metrics.runsLast30Days}
            icon={ListChecksIcon}
          />
          <MetricTile
            label="Executed"
            value={metrics.actionsAppliedLast30Days}
            icon={CheckCircle2Icon}
          />
          <MetricTile
            label="Blocked by permissions"
            value={metrics.blockedActionsLast30Days}
            icon={BanIcon}
          />
          <MetricTile
            label="Duplicate skips"
            value={metrics.skippedDuplicatesLast30Days}
            icon={CopyIcon}
          />
        </div>

        {(metrics.bookingFailuresLast30Days > 0 || metrics.failedRunsLast30Days > 0) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              {metrics.bookingFailuresLast30Days > 0
                ? `${metrics.bookingFailuresLast30Days} booking failure(s) in the last 30 days. `
                : ""}
              {metrics.failedRunsLast30Days > 0
                ? `${metrics.failedRunsLast30Days} failed run(s) overall.`
                : ""}
            </p>
          </div>
        )}

        {recentRuns.length > 0 ? (
          <ul className="space-y-2">
            {recentRuns.map((run) => {
              const classified = classifyAgentRunActions(run.actions);

              return (
                <li key={run.id} className="rounded-lg border px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getChannelLabel(run.channel)}</Badge>
                    {!run.success ? <Badge variant="destructive">Failed</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(run.createdAt)}
                    </span>
                    {run.contactId ? (
                      <Link
                        href={buildContactsHref({
                          contact: run.contactId,
                          profile: true,
                        })}
                        className="text-xs text-primary hover:underline"
                      >
                        {run.contactName ?? "Contact"}
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-muted-foreground">
                    {run.messagePreview}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      ...classified.meta,
                      ...classified.planned,
                      ...classified.executed,
                      ...classified.blocked,
                      ...classified.skipped,
                      ...classified.failed,
                    ].map((entry) => (
                      <Badge
                        key={entry.raw}
                        variant="secondary"
                        className={cn("text-[10px] font-normal", actionBadgeClass(entry.kind))}
                      >
                        {entry.label}
                      </Badge>
                    ))}
                    {run.actions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No CRM plan recorded
                      </span>
                    ) : null}
                  </div>
                  {run.errorMessage ? (
                    <p className="mt-2 text-xs text-destructive">{run.errorMessage}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No agent runs yet. CRM activity appears here after customers message
            connected channels.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
