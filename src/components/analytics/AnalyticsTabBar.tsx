"use client";

import { getNavSegmentActiveClassName } from "@/features/navigation/channel-rail-ui";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import { ANALYTICS_TABS, type AnalyticsTab } from "@/utils/analytics-url";

type AnalyticsTabBarProps = {
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  variant?: "default" | "header";
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
  variant = "default",
  className,
}: AnalyticsTabBarProps) {
  if (variant === "header") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 overflow-x-auto",
          className,
        )}
      >
        {ANALYTICS_TABS.map((tab) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors sm:px-3 sm:py-1.5 sm:text-sm",
                getNavSegmentActiveClassName(isActive),
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {ANALYTICS_TABS.map((tab) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "h-8 shrink-0 rounded-lg px-2.5 text-xs sm:text-sm",
                getNavSegmentActiveClassName(isActive),
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
