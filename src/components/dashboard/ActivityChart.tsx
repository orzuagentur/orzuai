"use client";

import { useMemo } from "react";

import { ProfessionalAreaChart } from "@/components/analytics/ProfessionalAreaChart";
import type { AnalyticsChartRangeDays } from "@/types/analytics-chart.types";
import type { ActivityDataPoint } from "@/types/dashboard.types";
import { activityToChartPoints } from "@/utils/activity-chart";

type ActivityChartProps = {
  data: ActivityDataPoint[];
  title?: string;
  description?: string;
  valueNoun?: string;
  className?: string;
  initialDays?: AnalyticsChartRangeDays;
  strokeColor?: string;
  fillId?: string;
};

function resolveInitialDays(
  dataLength: number,
  preferred?: AnalyticsChartRangeDays,
): AnalyticsChartRangeDays {
  if (preferred) {
    return preferred;
  }

  if (dataLength >= 30) return 30;
  if (dataLength >= 14) return 14;
  if (dataLength >= 7) return 7;
  return 7;
}

export function ActivityChart({
  data,
  title = "Activity",
  description = "Volume over time. Use the clock to change the period.",
  valueNoun = "messages",
  className,
  initialDays,
  strokeColor,
  fillId = "activityAreaFill",
}: ActivityChartProps) {
  const points = useMemo(() => activityToChartPoints(data), [data]);
  const days = resolveInitialDays(data.length, initialDays);

  return (
    <div className={className}>
      <ProfessionalAreaChart
        title={title}
        description={description}
        valueNoun={valueNoun}
        initialPoints={points}
        initialDays={days}
        strokeColor={strokeColor}
        fillId={fillId}
      />
    </div>
  );
}
