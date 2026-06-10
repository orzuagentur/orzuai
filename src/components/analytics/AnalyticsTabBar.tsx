"use client";

import { Button } from "@/components/ui/button";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import { ANALYTICS_TABS, type AnalyticsTab } from "@/utils/analytics-url";

type AnalyticsTabBarProps = {
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  className?: string;
};

const TAB_LABELS: Record<AnalyticsTab, string> = {
  pulse: ANALYTICS_MESSAGES.tabPulse,
  channels: ANALYTICS_MESSAGES.tabChannels,
  sales: ANALYTICS_MESSAGES.tabSales,
  ai_ops: ANALYTICS_MESSAGES.tabAiOps,
  ask: ANALYTICS_MESSAGES.tabAsk,
};

export function AnalyticsTabBar({
  activeTab,
  onTabChange,
  className,
}: AnalyticsTabBarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {ANALYTICS_TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            size="sm"
            variant={activeTab === tab ? "secondary" : "ghost"}
            className="h-8 shrink-0 px-2.5 text-xs sm:text-sm"
            onClick={() => onTabChange(tab)}
          >
            {TAB_LABELS[tab]}
          </Button>
        ))}
      </div>
    </div>
  );
}
