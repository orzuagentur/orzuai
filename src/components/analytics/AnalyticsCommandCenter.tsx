"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { AnalyticsAskPanel } from "@/components/analytics/AnalyticsAskPanel";
import { AnalyticsChannelsPanel } from "@/components/analytics/AnalyticsChannelsPanel";
import { AnalyticsAiOpsPanel } from "@/components/analytics/AnalyticsAiOpsPanel";
import { AnalyticsPulsePanel } from "@/components/analytics/AnalyticsPulsePanel";
import { AnalyticsSalesPanel } from "@/components/analytics/AnalyticsSalesPanel";
import { AnalyticsTabBar } from "@/components/analytics/AnalyticsTabBar";
import type { AnalyticsPageData } from "@/types/channel-workspace.types";
import {
  buildAnalyticsHref,
  type AnalyticsPeriod,
  type AnalyticsTab,
} from "@/utils/analytics-url";

type AnalyticsCommandCenterProps = {
  data: AnalyticsPageData;
};

export function AnalyticsCommandCenter({ data }: AnalyticsCommandCenterProps) {
  const router = useRouter();

  const handleTabChange = useCallback(
    (tab: AnalyticsTab) => {
      router.push(
        buildAnalyticsHref({
          tab,
          period: data.activePeriod,
          channel: tab === "channels" ? data.activeChannelId : null,
        }),
      );
    },
    [data.activeChannelId, data.activePeriod, router],
  );

  const handlePeriodChange = useCallback(
    (period: AnalyticsPeriod) => {
      router.push(
        buildAnalyticsHref({
          tab: data.activeTab,
          period,
          channel: data.activeTab === "channels" ? data.activeChannelId : null,
        }),
      );
      router.refresh();
    },
    [data.activeChannelId, data.activeTab, router],
  );

  const handleClearChannel = useCallback(() => {
    router.push(
      buildAnalyticsHref({
        tab: "channels",
        period: data.activePeriod,
        channel: null,
      }),
    );
  }, [data.activePeriod, router]);

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <AnalyticsTabBar activeTab={data.activeTab} onTabChange={handleTabChange} />

      {data.activeTab === "pulse" ? (
        <AnalyticsPulsePanel
          pulse={data.pulse}
          activePeriod={data.activePeriod}
          onPeriodChange={handlePeriodChange}
        />
      ) : null}

      {data.activeTab === "channels" ? (
        <AnalyticsChannelsPanel
          data={data}
          onClearChannel={handleClearChannel}
        />
      ) : null}

      {data.activeTab === "sales" ? (
        <AnalyticsSalesPanel
          leadSources={data.leadSources}
          crmFunnel={data.crmFunnel}
          revenue={data.revenue}
          sentiment={data.sentiment}
        />
      ) : null}

      {data.activeTab === "ai_ops" ? (
        <AnalyticsAiOpsPanel
          aiPerformance={data.aiPerformance}
          teamAnalytics={data.teamAnalytics}
          responseTime={data.responseTime}
          aiCost={data.aiCost}
          agentsRollup={data.agentsRollup}
          automationOps={data.automationOps}
        />
      ) : null}

      {data.activeTab === "ask" ? <AnalyticsAskPanel /> : null}
    </div>
  );
}
