"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3Icon, Layers2Icon, Loader2Icon } from "lucide-react";

import { ProfessionalAreaChart } from "@/components/analytics/ProfessionalAreaChart";
import { HoverIconMenu } from "@/components/dashboard/HoverIconMenu";
import {
  DASHBOARD_ACTIVITY_VIEWS,
  DASHBOARD_CARD_PERIOD_OPTIONS,
  periodLabel,
} from "@/features/dashboard/metric-cards";
import type {
  AnalyticsChartPoint,
  AnalyticsChartRangeDays,
} from "@/types/analytics-chart.types";
import type {
  DashboardActivityViewId,
  DashboardCardPeriod,
} from "@/types/dashboard-home.types";

type DashboardActivityPanelProps = {
  initialPoints: AnalyticsChartPoint[];
  initialPeriod?: DashboardCardPeriod;
};

function mapPeriodToSeriesDays(period: DashboardCardPeriod): AnalyticsChartRangeDays {
  if (period === "week") return 7;
  return 30;
}

export function DashboardActivityPanel({
  initialPoints,
  initialPeriod = "week",
}: DashboardActivityPanelProps) {
  const [view, setView] = useState<DashboardActivityViewId>("messageActivity");
  const [period, setPeriod] = useState<DashboardCardPeriod>(initialPeriod);
  const [points, setPoints] = useState(initialPoints);
  const [days, setDays] = useState<AnalyticsChartRangeDays>(
    mapPeriodToSeriesDays(initialPeriod),
  );
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<
    Partial<Record<string, AnalyticsChartPoint[]>>
  >({
    [`messageActivity:${mapPeriodToSeriesDays(initialPeriod)}`]: initialPoints,
  });

  const activeView =
    DASHBOARD_ACTIVITY_VIEWS.find((item) => item.id === view) ??
    DASHBOARD_ACTIVITY_VIEWS[0]!;

  const loadSeries = useCallback(
    async (nextView: DashboardActivityViewId, nextPeriod: DashboardCardPeriod) => {
      const viewMeta =
        DASHBOARD_ACTIVITY_VIEWS.find((item) => item.id === nextView) ??
        DASHBOARD_ACTIVITY_VIEWS[0]!;
      const nextDays = mapPeriodToSeriesDays(nextPeriod);
      const cacheKey = `${nextView}:${nextDays}`;
      const cached = cacheRef.current[cacheKey];

      if (cached) {
        setDays(nextDays);
        setPoints(cached);
        return;
      }

      setIsLoading(true);
      setPoints([]);
      try {
        const formatParam =
          viewMeta.metric === "calls" ? "&format=area" : "";
        const response = await fetch(
          `/api/analytics/series?metric=${viewMeta.metric}&days=${nextDays}${formatParam}`,
        );
        const payload = (await response.json()) as {
          success: boolean;
          points?: AnalyticsChartPoint[];
        };

        if (response.ok && payload.success) {
          const nextPoints = payload.points ?? [];
          cacheRef.current[cacheKey] = nextPoints;
          setDays(nextDays);
          setPoints(nextPoints);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSeries(view, period);
  }, [loadSeries, period, view]);

  return (
    <ProfessionalAreaChart
      key={`${activeView.id}-${days}`}
      title={activeView.label}
      description={`${activeView.description} Period: ${periodLabel(period)}.`}
      metric={activeView.metric}
      valueNoun={activeView.valueNoun}
      initialPoints={points}
      initialDays={days}
      strokeColor={activeView.strokeColor}
      fillId={activeView.fillId}
      showRangePicker={false}
      headerActions={
        <>
          <HoverIconMenu
            title="Period"
            icon={
              isLoading ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <Clock3Icon className="size-3.5" />
              )
            }
            options={DASHBOARD_CARD_PERIOD_OPTIONS}
            activeId={period}
            onSelect={(id) => setPeriod(id as DashboardCardPeriod)}
            disabled={isLoading}
          />
          <HoverIconMenu
            title="Chart view"
            icon={<Layers2Icon className="size-3.5" />}
            options={DASHBOARD_ACTIVITY_VIEWS.map((item) => ({
              id: item.id,
              label: item.label,
            }))}
            activeId={view}
            onSelect={(id) => setView(id as DashboardActivityViewId)}
            disabled={isLoading}
          />
        </>
      }
    />
  );
}
