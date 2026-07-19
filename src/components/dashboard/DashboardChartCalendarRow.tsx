"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { DashboardHomeCalendarCard } from "@/components/dashboard/DashboardHomeCalendarCard";
import { cn } from "@/lib/utils";

type DashboardChartCalendarRowProps = {
  chart: ReactNode;
  eventDayKeys: string[];
};

export function DashboardChartCalendarRow({
  chart,
  eventDayKeys,
}: DashboardChartCalendarRowProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number | null>(null);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;

    const update = () => {
      const height = Math.round(node.getBoundingClientRect().height);
      if (height > 0) {
        setChartHeight(height);
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
      <div ref={chartRef} className="min-w-0 xl:col-span-2">
        {chart}
      </div>
      <div
        className={cn("min-w-0", chartHeight ? "xl:overflow-hidden" : null)}
        style={
          chartHeight
            ? { height: chartHeight, maxHeight: chartHeight }
            : undefined
        }
      >
        <DashboardHomeCalendarCard
          eventDayKeys={eventDayKeys}
          className="h-full"
        />
      </div>
    </div>
  );
}
