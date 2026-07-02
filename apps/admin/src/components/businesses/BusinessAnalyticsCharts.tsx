"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { BarChart3Icon } from "lucide-react";
import { toast } from "sonner";

import { DailyBarChart } from "@/components/ui/DailyBarChart";
import { SectionCard } from "@/components/ui/SectionCard";
import { fetchBusinessAnalyticsSeriesAction } from "@/features/businesses/actions";
import type { BusinessAnalyticsSeries } from "@/features/businesses/types";

type BusinessAnalyticsChartsProps = {
  businessId: string;
  days: number;
};

export function BusinessAnalyticsCharts({
  businessId,
  days,
}: BusinessAnalyticsChartsProps) {
  const [analytics, setAnalytics] = useState<BusinessAnalyticsSeries | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchBusinessAnalyticsSeriesAction(businessId, days);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setAnalytics(result.analytics);
    });
  }, [businessId, days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SectionCard
      title="Analytics"
      description={`Активность по дням за ${days} дней`}
      icon={BarChart3Icon}
    >
      {analytics ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <DailyBarChart
            title={`Сообщения · всего ${analytics.totals.messages}`}
            data={analytics.series.map((entry) => ({
              date: entry.date,
              value: entry.messages,
            }))}
            valueLabel="сообщений"
          />
          <DailyBarChart
            title={`AI расход · $${analytics.totals.aiCostUsd.toFixed(2)}`}
            data={analytics.series.map((entry) => ({
              date: entry.date,
              value: entry.aiCostUsd,
            }))}
            valueLabel="USD"
            formatValue={(value) => value.toFixed(2)}
            barClassName="bg-amber-500/70"
          />
          <DailyBarChart
            title={`Звонки · всего ${analytics.totals.voiceCalls}`}
            data={analytics.series.map((entry) => ({
              date: entry.date,
              value: entry.voiceCalls,
            }))}
            valueLabel="звонков"
            barClassName="bg-sky-500/70"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Загрузка analytics…</p>
      )}

      {isPending ? (
        <p className="mt-3 text-xs text-muted-foreground">Обновление графиков…</p>
      ) : null}
    </SectionCard>
  );
}
