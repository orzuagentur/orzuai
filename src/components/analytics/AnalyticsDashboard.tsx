"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { AnalyticsAttentionFeed } from "@/components/analytics/AnalyticsAttentionFeed";
import { AnalyticsCallsChart } from "@/components/analytics/AnalyticsCallsChart";
import { AnalyticsPeriodFilter } from "@/components/analytics/AnalyticsPeriodFilter";
import { ProfessionalAreaChart } from "@/components/analytics/ProfessionalAreaChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import type { AnalyticsPageData } from "@/types/channel-workspace.types";
import {
  analyticsPeriodToDays,
  buildAnalyticsHref,
  type AnalyticsPeriod,
} from "@/utils/analytics-url";
import { formatMetricValue } from "@/utils/dashboard";

type AnalyticsDashboardProps = {
  data: AnalyticsPageData;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDelta(deltaPercent: number | null, kpiId: string) {
  if (deltaPercent == null) {
    return "—";
  }

  const prefix = deltaPercent > 0 ? "+" : "";
  const suffix =
    kpiId === "avg_first_response" && deltaPercent < 0 ? " faster" : "";

  return `${prefix}${deltaPercent}% ${ANALYTICS_MESSAGES.pulseDeltaVsPrevious}${suffix}`;
}

function deltaTone(deltaPercent: number | null, kpiId: string) {
  if (deltaPercent == null || deltaPercent === 0) {
    return "text-muted-foreground";
  }

  if (kpiId === "avg_first_response") {
    return deltaPercent < 0 ? "text-zinc-600" : "text-amber-600";
  }

  return deltaPercent > 0 ? "text-zinc-600" : "text-amber-600";
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const router = useRouter();
  const chartDays = analyticsPeriodToDays(data.activePeriod);

  const handlePeriodChange = useCallback(
    (period: AnalyticsPeriod) => {
      router.push(buildAnalyticsHref({ period }));
      router.refresh();
    },
    [router],
  );

  const wonStage = data.crmFunnel.stages.find((stage) => stage.stage === "won");
  const lostStage = data.crmFunnel.stages.find((stage) => stage.stage === "lost");
  const openPipeline = data.crmFunnel.stages.filter(
    (stage) => stage.stage !== "won" && stage.stage !== "lost",
  );

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">
            {ANALYTICS_MESSAGES.dashboardTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.dashboardDescription}
          </p>
        </div>
        <AnalyticsPeriodFilter
          activePeriod={data.activePeriod}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.pulse.kpis.map((kpi) => (
          <Card key={kpi.id} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
              <p className={cn("mt-1 text-xs", deltaTone(kpi.deltaPercent, kpi.id))}>
                {formatDelta(kpi.deltaPercent, kpi.id)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProfessionalAreaChart
          title={ANALYTICS_MESSAGES.chartMessagesTitle}
          description={ANALYTICS_MESSAGES.chartMessagesDescription}
          metric="messages"
          valueNoun="messages"
          initialPoints={data.messageSeries}
          initialDays={chartDays}
          fillId="analyticsMessagesFill"
        />
        <ProfessionalAreaChart
          title={ANALYTICS_MESSAGES.chartClientsTitle}
          description={ANALYTICS_MESSAGES.chartClientsDescription}
          metric="clients"
          valueNoun="clients"
          initialPoints={data.clientSeries}
          initialDays={chartDays}
          strokeColor="rgb(14 165 233)"
          fillId="analyticsClientsFill"
        />
      </div>

      <ProfessionalAreaChart
        title={ANALYTICS_MESSAGES.chartDealsTitle}
        description={ANALYTICS_MESSAGES.chartDealsDescription}
        metric="deals"
        valueNoun="outcomes"
        initialPoints={data.dealSeries}
        initialDays={chartDays}
        strokeColor="rgb(16 185 129)"
        fillId="analyticsDealsFill"
      />

      <AnalyticsCallsChart
        initialPoints={data.callSeries}
        initialDays={chartDays}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {ANALYTICS_MESSAGES.pipelineTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {ANALYTICS_MESSAGES.pipelineWon}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-700">
                  {formatMetricValue(wonStage?.count ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(data.revenue.wonRevenue)}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {ANALYTICS_MESSAGES.pipelineLost}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-700">
                  {formatMetricValue(lostStage?.count ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.crmFunnel.qualifiedToWonRate}% win rate
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  {ANALYTICS_MESSAGES.pipelineOpen}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatMetricValue(data.revenue.openDealsCount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(data.revenue.totalPipelineValue)} pipeline
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {openPipeline.map((stage) => {
                const maxCount = Math.max(
                  ...data.crmFunnel.stages.map((item) => item.count),
                  1,
                );
                const width = Math.max(8, Math.round((stage.count / maxCount) * 100));

                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-muted-foreground">
                        {stage.stage}
                      </span>
                      <span className="font-medium tabular-nums">{stage.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-violet-500/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <AnalyticsAttentionFeed items={data.pulse.attention} />
      </div>
    </div>
  );
}
