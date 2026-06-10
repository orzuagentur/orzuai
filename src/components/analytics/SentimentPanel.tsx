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
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { SentimentBreakdown } from "@/types/dashboard.types";

type SentimentPanelProps = {
  breakdown: SentimentBreakdown;
  negativeHref?: string | null;
};

const SENTIMENT_ITEMS = [
  { key: "positive" as const, labelKey: "sentimentPositive" as const },
  { key: "neutral" as const, labelKey: "sentimentNeutral" as const },
  { key: "negative" as const, labelKey: "sentimentNegative" as const },
  { key: "unknown" as const, labelKey: "sentimentUnknown" as const },
];

export function SentimentPanel({
  breakdown,
  negativeHref,
}: SentimentPanelProps) {
  const total =
    breakdown.positive +
    breakdown.neutral +
    breakdown.negative +
    breakdown.unknown;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.sentimentTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.sentimentDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.sentimentEmpty}
          </p>
        ) : (
          <ul className="space-y-2">
            {SENTIMENT_ITEMS.map((item) => {
              const count = breakdown[item.key];
              const percent = Math.round((count / total) * 100);
              const showLink =
                item.key === "negative" && count > 0 && negativeHref;

              return (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{ANALYTICS_MESSAGES[item.labelKey]}</span>
                  <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                    {count} ({percent}%)
                    {showLink ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2"
                        asChild
                      >
                        <Link href={negativeHref}>
                          {ANALYTICS_MESSAGES.viewContacts(count)}
                          <ArrowRightIcon className="size-3.5" />
                        </Link>
                      </Button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
