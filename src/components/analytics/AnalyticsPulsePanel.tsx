"use client";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { AnalyticsAttentionFeed } from "@/components/analytics/AnalyticsAttentionFeed";
import { AnalyticsPeriodFilter } from "@/components/analytics/AnalyticsPeriodFilter";
import { Card, CardContent } from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import type { AnalyticsPulseData } from "@/types/analytics.types";
import type { AnalyticsPeriod } from "@/utils/analytics-url";

type AnalyticsPulsePanelProps = {
  pulse: AnalyticsPulseData;
  activePeriod: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
};

function formatDelta(
  deltaPercent: number | null,
  activePeriod: AnalyticsPeriod,
  kpiId: string,
) {
  if (activePeriod === "all") {
    return ANALYTICS_MESSAGES.pulseDeltaUnavailable;
  }

  if (deltaPercent == null) {
    return "—";
  }

  const prefix = deltaPercent > 0 ? "+" : "";
  const suffix = kpiId === "avg_first_response" && deltaPercent < 0 ? " faster" : "";

  return `${prefix}${deltaPercent}% ${ANALYTICS_MESSAGES.pulseDeltaVsPrevious}${suffix}`;
}

function deltaTone(deltaPercent: number | null, kpiId: string) {
  if (deltaPercent == null || deltaPercent === 0) {
    return "text-muted-foreground";
  }

  if (kpiId === "avg_first_response") {
    return deltaPercent < 0 ? "text-emerald-600" : "text-amber-600";
  }

  return deltaPercent > 0 ? "text-emerald-600" : "text-amber-600";
}

export function AnalyticsPulsePanel({
  pulse,
  activePeriod,
  onPeriodChange,
}: AnalyticsPulsePanelProps) {
  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{ANALYTICS_MESSAGES.pulseTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.pulseDescription}
          </p>
        </div>
        <AnalyticsPeriodFilter
          activePeriod={activePeriod}
          onPeriodChange={onPeriodChange}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pulse.kpis.map((kpi) => (
          <Card key={kpi.id} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  deltaTone(kpi.deltaPercent, kpi.id),
                )}
              >
                {formatDelta(kpi.deltaPercent, activePeriod, kpi.id)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ActivityChart
          data={pulse.activity}
          title={ANALYTICS_MESSAGES.pulseActivityTitle}
          description={ANALYTICS_MESSAGES.pulseActivityDescription(
            pulse.activityDays,
          )}
        />
        <AnalyticsAttentionFeed items={pulse.attention} />
      </div>
    </div>
  );
}
