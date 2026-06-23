"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { isUnlimitedAiReplies } from "@/features/subscription/plans";
import type { AiUsageSummary } from "@/types/ai-usage.types";

type AiUsageLimitsPanelProps = {
  usage: AiUsageSummary | null;
};

export function AiUsageLimitsPanel({ usage }: AiUsageLimitsPanelProps) {
  if (!usage) {
    return null;
  }

  const unlimited = isUnlimitedAiReplies(usage.monthlyLimit);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{AI_ASSISTANT_MESSAGES.usageTitle}</CardTitle>
        <CardDescription>{AI_ASSISTANT_MESSAGES.usageDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            Plan: <strong>{usage.planLabel}</strong>
          </span>
          <span className="tabular-nums text-muted-foreground">
            {unlimited
              ? `${usage.usedReplies} AI replies this month (unlimited)`
              : `${usage.usedReplies} / ${usage.monthlyLimit} AI replies this month`}
          </span>
        </div>
        {!unlimited ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${usage.usagePercent}%` }}
            />
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {unlimited
            ? "No monthly reply limit on your current plan."
            : `${usage.remainingReplies} replies remaining. Usage resets at the start of each calendar month.`}
        </p>
      </CardContent>
    </Card>
  );
}
