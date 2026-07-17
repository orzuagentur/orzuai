"use client";

import { Button } from "@/components/ui/button";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/utils/analytics-url";

type AnalyticsPeriodFilterProps = {
  activePeriod: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  className?: string;
};

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "24h": ANALYTICS_MESSAGES.period24h,
  "7d": ANALYTICS_MESSAGES.period7d,
  "14d": ANALYTICS_MESSAGES.period14d,
  "30d": ANALYTICS_MESSAGES.period30d,
};

export function AnalyticsPeriodFilter({
  activePeriod,
  onPeriodChange,
  className,
}: AnalyticsPeriodFilterProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {ANALYTICS_PERIODS.map((period) => (
        <Button
          key={period}
          type="button"
          size="sm"
          variant={activePeriod === period ? "secondary" : "outline"}
          className="h-8 px-2.5 text-xs"
          onClick={() => onPeriodChange(period)}
        >
          {PERIOD_LABELS[period]}
        </Button>
      ))}
    </div>
  );
}
