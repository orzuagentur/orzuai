"use client";

import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BellIcon,
  InfoIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import type { AnalyticsAttentionItem } from "@/types/analytics.types";

type AnalyticsAttentionFeedProps = {
  items: AnalyticsAttentionItem[];
};

function severityIcon(severity: AnalyticsAttentionItem["severity"]) {
  if (severity === "critical") {
    return AlertTriangleIcon;
  }

  if (severity === "warning") {
    return BellIcon;
  }

  return InfoIcon;
}

function severityClass(severity: AnalyticsAttentionItem["severity"]) {
  if (severity === "critical") {
    return "border-destructive/30 bg-destructive/5";
  }

  if (severity === "warning") {
    return "border-amber-500/30 bg-amber-500/5";
  }

  return "border-border bg-muted/20";
}

export function AnalyticsAttentionFeed({ items }: AnalyticsAttentionFeedProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{ANALYTICS_MESSAGES.attentionTitle}</CardTitle>
        <CardDescription>
          Actionable signals based on inbox, CRM, channels, and automations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.attentionEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const Icon = severityIcon(item.severity);

              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    severityClass(item.severity),
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.description ? (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 gap-1 px-2"
                    asChild
                  >
                    <Link href={item.href}>
                      {item.actionLabel}
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
