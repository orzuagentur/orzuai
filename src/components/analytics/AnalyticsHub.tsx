"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3Icon } from "lucide-react";

import { AiAnalyticsAssistantPanel } from "@/components/analytics/AiAnalyticsAssistantPanel";
import { AiCostPanel } from "@/components/analytics/AiCostPanel";
import { RevenueMetricsPanel } from "@/components/analytics/RevenueMetricsPanel";
import { SentimentPanel } from "@/components/analytics/SentimentPanel";
import { TeamAnalyticsPanel } from "@/components/analytics/TeamAnalyticsPanel";
import { AiPerformancePanel } from "@/components/analytics/AiPerformancePanel";
import { CrmFunnelPanel } from "@/components/analytics/CrmFunnelPanel";
import { LeadSourcePanel } from "@/components/analytics/LeadSourcePanel";
import { ResponseTimePanel } from "@/components/analytics/ResponseTimePanel";
import { ChannelAnalyticsPanel } from "@/components/channel-workspace/ChannelAnalyticsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import {
  INTEGRATION_CHANNEL_LIST,
  MESSAGING_INTEGRATION_CHANNELS,
  buildIntegrationActivateHref,
  type IntegrationChannelStatusEntry,
} from "@/features/integrations";
import type { AnalyticsPageData } from "@/types/channel-workspace.types";
import { formatMetricValue } from "@/utils/dashboard";

type AnalyticsHubProps = {
  data: AnalyticsPageData;
};

function statusBadgeVariant(
  status: IntegrationChannelStatusEntry["status"],
): "default" | "secondary" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function AnalyticsHub({ data }: AnalyticsHubProps) {
  const searchParams = useSearchParams();
  const channelParam = searchParams.get("channel");
  const activeChannel =
    data.channels.find((entry) => entry.channel === channelParam)?.channel ??
    data.activeChannel;

  const activeEntry = data.channels.find(
    (entry) => entry.channel === activeChannel,
  );

  const overviewMetrics = [
    {
      label: ANALYTICS_MESSAGES.totalMessages,
      value: formatMetricValue(data.totals.totalMessages),
    },
    {
      label: ANALYTICS_MESSAGES.totalContacts,
      value: formatMetricValue(data.totals.totalContacts),
    },
    {
      label: ANALYTICS_MESSAGES.aiReplies,
      value: formatMetricValue(data.totals.aiReplies),
    },
    {
      label: ANALYTICS_MESSAGES.activeConversations,
      value: formatMetricValue(data.totals.activeConversations),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex min-h-[32rem] flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b lg:w-56 lg:border-b-0 lg:border-r">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {ANALYTICS_MESSAGES.channelsTitle}
            </p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col">
            {MESSAGING_INTEGRATION_CHANNELS.map((channelId) => {
              const channel = INTEGRATION_CHANNEL_LIST.find(
                (item) => item.id === channelId,
              );
              if (!channel) {
                return null;
              }
              const href = `${DASHBOARD_ROUTES.analytics}?channel=${channelId}`;
              const isActive = activeChannel === channelId;
              const entry = data.channels.find((c) => c.channel === channelId);
              const status =
                data.channelStatuses[channelId]?.status ?? "disconnected";

              return (
                <Link
                  key={channelId}
                  href={href}
                  className={cn(
                    "flex min-w-[9rem] items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors lg:min-w-0",
                    isActive
                      ? "bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <span>{channel.label}</span>
                  <Badge
                    variant={statusBadgeVariant(status)}
                    className="shrink-0 text-[10px]"
                  >
                    {entry?.analytics.totalMessages ?? 0}
                  </Badge>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3Icon className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base">
                    {ANALYTICS_MESSAGES.overviewTitle}
                  </CardTitle>
                  <CardDescription>
                    {ANALYTICS_MESSAGES.overviewDescription}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {overviewMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-lg border bg-muted/20 p-3"
                  >
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <AiPerformancePanel metrics={data.aiPerformance} />
            <LeadSourcePanel sources={data.leadSources} />
            <ResponseTimePanel metrics={data.responseTime} />
            <CrmFunnelPanel funnel={data.crmFunnel} />
            <AiCostPanel metrics={data.aiCost} />
            <TeamAnalyticsPanel metrics={data.teamAnalytics} />
            <RevenueMetricsPanel metrics={data.revenue} />
            <SentimentPanel breakdown={data.sentiment} />
          </div>

          <AiAnalyticsAssistantPanel />

          {activeEntry?.isChannelConnected ? (
            <ChannelAnalyticsPanel data={activeEntry.analytics} />
          ) : activeEntry ? (
            <Card className="max-w-2xl shadow-none">
              <CardHeader>
                <CardTitle>
                  {
                    INTEGRATION_CHANNEL_LIST.find(
                      (c) => c.id === activeEntry.channel,
                    )?.label
                  }
                </CardTitle>
                <CardDescription>
                  {ANALYTICS_MESSAGES.channelNotConnected}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={buildIntegrationActivateHref(activeEntry.channel)}>
                    {ANALYTICS_MESSAGES.goToIntegrations}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a channel to view analytics.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
