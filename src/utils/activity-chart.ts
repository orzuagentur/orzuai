import type { AnalyticsChartPoint } from "@/types/analytics-chart.types";
import type { ActivityDataPoint } from "@/types/dashboard.types";

export function activityToChartPoints(
  data: ActivityDataPoint[],
): AnalyticsChartPoint[] {
  return data.map((point, index) => ({
    key: `activity-${index}-${point.label}`,
    label: point.label,
    timeLabel: point.label,
    value: point.value,
    segments: [],
  }));
}
