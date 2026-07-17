"use client";

import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import type { AnalyticsPageData } from "@/types/channel-workspace.types";

type AnalyticsCommandCenterProps = {
  data: AnalyticsPageData;
};

export function AnalyticsCommandCenter({ data }: AnalyticsCommandCenterProps) {
  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <AnalyticsDashboard data={data} />
    </div>
  );
}
