"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { AiCostMetrics } from "@/types/ai-usage.types";

type AiCostPanelProps = {
  metrics: AiCostMetrics;
};

function formatUsd(value: number): string {
  if (value === 0) {
    return "$0.00";
  }

  if (value < 0.01) {
    return `<$0.01`;
  }

  return `$${value.toFixed(2)}`;
}

export function AiCostPanel({ metrics }: AiCostPanelProps) {
  if (!metrics.hasCustomBilling) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {ANALYTICS_MESSAGES.aiCostPlatformIncludedTitle}
          </CardTitle>
          <CardDescription>
            {ANALYTICS_MESSAGES.aiCostPlatformIncludedDescription}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.aiCostTitle}
        </CardTitle>
        <CardDescription>{ANALYTICS_MESSAGES.aiCostDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.aiCostMonth}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatUsd(metrics.monthCostUsd)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              {ANALYTICS_MESSAGES.aiCostPerReply}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatUsd(metrics.avgCostPerReplyUsd)}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {metrics.monthReplies} AI replies this month ·{" "}
          {formatUsd(metrics.totalCostUsd)} all-time
        </p>

        {metrics.byProvider.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {metrics.byProvider.map((entry) => (
              <li
                key={entry.provider}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="capitalize">{entry.provider}</span>
                <span className="tabular-nums text-muted-foreground">
                  {entry.replies} replies · {formatUsd(entry.costUsd)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.aiCostEmpty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
