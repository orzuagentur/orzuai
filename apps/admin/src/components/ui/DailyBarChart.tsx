"use client";

import { cn } from "@/lib/utils";

type DailyBar = {
  date: string;
  value: number;
};

type DailyBarChartProps = {
  title: string;
  data: DailyBar[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
  barClassName?: string;
  emptyLabel?: string;
};

function defaultFormat(value: number): string {
  return String(value);
}

export function DailyBarChart({
  title,
  data,
  valueLabel = "value",
  formatValue = defaultFormat,
  barClassName = "bg-primary/70",
  emptyLabel = "Нет данных за период",
}: DailyBarChartProps) {
  const maxValue = Math.max(...data.map((entry) => entry.value), 1);
  const hasActivity = data.some((entry) => entry.value > 0);

  return (
    <div className="rounded-lg border bg-muted/10 p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      {!hasActivity ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex h-24 items-end gap-1">
          {data.map((entry) => {
            const height = Math.max(8, Math.round((entry.value / maxValue) * 100));

            return (
              <div
                key={entry.date}
                title={`${entry.date}: ${formatValue(entry.value)} ${valueLabel}`}
                className={cn("flex-1 rounded-t", barClassName)}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
