"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Clock3Icon, Loader2Icon, TrendingUpIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { cn } from "@/lib/utils";
import {
  ANALYTICS_CALL_SERIES_KEYS,
  type AnalyticsCallFilter,
  type AnalyticsCallsChartPoint,
  type AnalyticsCallSeriesKey,
  type AnalyticsChartRangeDays,
} from "@/types/analytics-chart.types";
import { formatMetricValue } from "@/utils/dashboard";

const RANGE_OPTIONS: Array<{ days: AnalyticsChartRangeDays; label: string }> = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

const FILTER_OPTIONS: Array<{
  id: AnalyticsCallFilter;
  label: string;
}> = [
  { id: "all", label: ANALYTICS_MESSAGES.chartCallsFilterAll },
  { id: "ai", label: ANALYTICS_MESSAGES.chartCallsFilterAi },
  { id: "manager", label: ANALYTICS_MESSAGES.chartCallsFilterManager },
  { id: "general", label: ANALYTICS_MESSAGES.chartCallsFilterGeneral },
  { id: "inbound", label: ANALYTICS_MESSAGES.chartCallsFilterInbound },
  { id: "outbound", label: ANALYTICS_MESSAGES.chartCallsFilterOutbound },
];

const SERIES_META: Record<
  AnalyticsCallSeriesKey,
  { label: string; color: string }
> = {
  ai: {
    label: ANALYTICS_MESSAGES.chartCallsLegendAi,
    color: "rgb(124 58 237)",
  },
  manager: {
    label: ANALYTICS_MESSAGES.chartCallsLegendManager,
    color: "rgb(217 119 6)",
  },
  general: {
    label: ANALYTICS_MESSAGES.chartCallsLegendGeneral,
    color: "rgb(100 116 139)",
  },
  inbound: {
    label: ANALYTICS_MESSAGES.chartCallsLegendInbound,
    color: "rgb(14 165 233)",
  },
  outbound: {
    label: ANALYTICS_MESSAGES.chartCallsLegendOutbound,
    color: "rgb(16 185 129)",
  },
};

const CHART_PADDING = { top: 18, right: 16, bottom: 8, left: 44 };
const PLOT_HEIGHT = 196;
const EDGE_SCROLL_ZONE = 56;
const EDGE_SCROLL_SPEED = 2.5;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_HEIGHT = 180;
const TOOLTIP_WIDTH = 188;
const TOOLTIP_PAD = 12;
const SPACING_24H = 54;
const SPACING_WEEK = 80;
const SPACING_MONTH = 44;

type AnalyticsCallsChartProps = {
  initialPoints: AnalyticsCallsChartPoint[];
  initialDays?: AnalyticsChartRangeDays;
};

type SeriesCoordinate = {
  x: number;
  y: number;
  value: number;
};

type PointCoordinate = {
  x: number;
  point: AnalyticsCallsChartPoint;
  series: Record<AnalyticsCallSeriesKey, SeriesCoordinate>;
};

function getPointSpacing(days: AnalyticsChartRangeDays): number {
  if (days === 1) return SPACING_24H;
  if (days <= 7) return SPACING_WEEK;
  return SPACING_MONTH;
}

function getTooltipStyle(anchorX: number, anchorY: number): CSSProperties {
  const half = TOOLTIP_WIDTH / 2;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let left = anchorX;
  let translateX = "-50%";

  if (anchorX - half < TOOLTIP_PAD) {
    left = TOOLTIP_PAD;
    translateX = "0";
  } else if (anchorX + half > viewportWidth - TOOLTIP_PAD) {
    left = viewportWidth - TOOLTIP_PAD;
    translateX = "-100%";
  }

  const canShowAbove = anchorY - TOOLTIP_OFFSET - TOOLTIP_HEIGHT >= TOOLTIP_PAD;

  if (canShowAbove) {
    return {
      position: "fixed",
      left,
      top: anchorY,
      transform: `translate(${translateX}, calc(-100% - ${TOOLTIP_OFFSET}px))`,
    };
  }

  return {
    position: "fixed",
    left,
    top: Math.min(
      anchorY + TOOLTIP_OFFSET,
      viewportHeight - TOOLTIP_HEIGHT - TOOLTIP_PAD,
    ),
    transform: `translateX(${translateX})`,
  };
}

function buildLinePath(coordinates: Array<{ x: number; y: number }>): string {
  return coordinates
    .map(
      (coordinate, index) =>
        `${index === 0 ? "M" : "L"} ${coordinate.x} ${coordinate.y}`,
    )
    .join(" ");
}

function visibleSeriesKeys(filter: AnalyticsCallFilter): AnalyticsCallSeriesKey[] {
  if (filter === "all") {
    return [...ANALYTICS_CALL_SERIES_KEYS];
  }
  return [filter];
}

function RangePicker({
  days,
  isLoading,
  onChange,
}: {
  days: AnalyticsChartRangeDays;
  isLoading: boolean;
  onChange: (days: AnalyticsChartRangeDays) => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  const activeLabel =
    RANGE_OPTIONS.find((option) => option.days === days)?.label ?? "7 days";

  return (
    <div
      className="absolute top-3 right-3 z-30"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        title={`Period: ${activeLabel}`}
        className="flex size-8 items-center justify-center rounded-lg border bg-background/95 text-muted-foreground shadow-sm transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <Clock3Icon className="size-4" />
      </button>
      {open ? (
        <div
          className="absolute top-full right-0 mt-1.5 w-36 rounded-xl border bg-background p-1.5 shadow-lg"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              disabled={isLoading}
              onClick={() => onChange(option.days)}
              className={cn(
                "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                days === option.days
                  ? "bg-violet-100 font-medium text-violet-800"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AnalyticsCallsChart({
  initialPoints,
  initialDays = 7,
}: AnalyticsCallsChartProps) {
  const [days, setDays] = useState<AnalyticsChartRangeDays>(initialDays);
  const [filter, setFilter] = useState<AnalyticsCallFilter>("all");
  const [points, setPoints] = useState(initialPoints);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });
  const [edgeScroll, setEdgeScroll] = useState<"left" | "right" | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(640);

  const seriesKeys = useMemo(() => visibleSeriesKeys(filter), [filter]);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width > 0) setViewportWidth(Math.floor(width));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (days === initialDays) {
      setPoints(initialPoints);
      return;
    }

    let cancelled = false;

    async function loadSeries() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/analytics/series?metric=calls&days=${days}`,
        );
        const payload = (await response.json()) as {
          success: boolean;
          points?: AnalyticsCallsChartPoint[];
        };

        if (!cancelled && response.ok && payload.success) {
          setPoints(payload.points ?? []);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSeries();
    return () => {
      cancelled = true;
    };
  }, [days, initialDays, initialPoints]);

  useEffect(() => {
    if (!edgeScroll) return;

    let frame = 0;
    const tick = () => {
      const element = scrollRef.current;
      if (!element || !edgeScroll) return;
      const maxScroll = element.scrollWidth - element.clientWidth;
      if (edgeScroll === "left" && element.scrollLeft > 0) {
        element.scrollLeft = Math.max(0, element.scrollLeft - EDGE_SCROLL_SPEED);
      }
      if (edgeScroll === "right" && element.scrollLeft < maxScroll) {
        element.scrollLeft = Math.min(
          maxScroll,
          element.scrollLeft + EDGE_SCROLL_SPEED,
        );
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [edgeScroll]);

  const pointSpacing = useMemo(() => getPointSpacing(days), [days]);
  const contentWidth = useMemo(() => {
    if (points.length <= 1) {
      return Math.max(
        viewportWidth,
        CHART_PADDING.left + CHART_PADDING.right + 240,
      );
    }
    return (
      CHART_PADDING.left +
      CHART_PADDING.right +
      (points.length - 1) * pointSpacing
    );
  }, [points.length, pointSpacing, viewportWidth]);

  const canScrollHorizontally = contentWidth > viewportWidth + 1;

  const total = useMemo(() => {
    return points.reduce((sum, point) => {
      if (filter === "all") {
        return sum + point.values.general;
      }
      return sum + point.values[filter];
    }, 0);
  }, [filter, points]);

  const peak = useMemo(() => {
    let max = 0;
    for (const point of points) {
      for (const key of seriesKeys) {
        max = Math.max(max, point.values[key]);
      }
    }
    return max;
  }, [points, seriesKeys]);

  const maxValue = Math.max(peak, 1);
  const yTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxValue / 4));
    const ticks: number[] = [];
    for (let value = 0; value <= maxValue; value += step) ticks.push(value);
    if (ticks[ticks.length - 1] !== maxValue) ticks.push(maxValue);
    return ticks;
  }, [maxValue]);

  const coordinates = useMemo((): PointCoordinate[] => {
    if (points.length === 0) return [];

    const plotWidth = contentWidth - CHART_PADDING.left - CHART_PADDING.right;
    const plotHeight = PLOT_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

    return points.map((point, index) => {
      const x = CHART_PADDING.left + index * stepX;
      const series = {} as Record<AnalyticsCallSeriesKey, SeriesCoordinate>;

      for (const key of ANALYTICS_CALL_SERIES_KEYS) {
        const value = point.values[key];
        const ratio = maxValue > 0 ? value / maxValue : 0;
        const y = CHART_PADDING.top + plotHeight - ratio * plotHeight;
        series[key] = { x, y, value };
      }

      return { x, point, series };
    });
  }, [contentWidth, maxValue, points]);

  const linePaths = useMemo(() => {
    const paths = {} as Record<AnalyticsCallSeriesKey, string>;
    for (const key of seriesKeys) {
      paths[key] = buildLinePath(
        coordinates.map((coordinate) => ({
          x: coordinate.series[key].x,
          y: coordinate.series[key].y,
        })),
      );
    }
    return paths;
  }, [coordinates, seriesKeys]);

  const hoveredCoordinate =
    hoveredIndex != null ? (coordinates[hoveredIndex] ?? null) : null;

  function updateTooltipAnchor(
    coordinate: PointCoordinate,
    scrollElement: HTMLDivElement,
    seriesKey: AnalyticsCallSeriesKey,
  ) {
    const svg = scrollElement.querySelector("svg");
    if (!svg) return;
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) return;
    const seriesPoint = coordinate.series[seriesKey];
    setTooltipAnchor({
      x: svgRect.left + (seriesPoint.x / contentWidth) * svgRect.width,
      y: svgRect.top + (seriesPoint.y / PLOT_HEIGHT) * svgRect.height,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const scrollElement = scrollRef.current;
    if (!scrollElement || coordinates.length === 0) {
      setHoveredIndex(null);
      setEdgeScroll(null);
      return;
    }

    const bounds = scrollElement.getBoundingClientRect();
    const xInView = event.clientX - bounds.left;
    const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;

    if (canScrollHorizontally && xInView < EDGE_SCROLL_ZONE && scrollElement.scrollLeft > 0) {
      setEdgeScroll("left");
    } else if (
      canScrollHorizontally &&
      xInView > bounds.width - EDGE_SCROLL_ZONE &&
      scrollElement.scrollLeft < maxScroll - 1
    ) {
      setEdgeScroll("right");
    } else {
      setEdgeScroll(null);
    }

    const svg = scrollElement.querySelector("svg");
    const svgRect = svg?.getBoundingClientRect();
    const xInContent =
      svgRect && svgRect.width > 0
        ? ((event.clientX - svgRect.left) / svgRect.width) * contentWidth
        : scrollElement.scrollLeft + xInView;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    coordinates.forEach((coordinate, index) => {
      const distance = Math.abs(coordinate.x - xInContent);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setHoveredIndex(nearestIndex);
    const nearest = coordinates[nearestIndex];
    const anchorKey = seriesKeys[0] ?? "general";
    if (nearest) updateTooltipAnchor(nearest, scrollElement, anchorKey);
  }

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.days === days)?.label ?? "7 days";

  return (
    <Card className="relative overflow-hidden shadow-none">
      <RangePicker days={days} isLoading={isLoading} onChange={setDays} />
      <CardHeader className="pb-2 pr-14">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.chartCallsTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.chartCallsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                filter === option.id
                  ? "border-violet-200 bg-violet-50 font-medium text-violet-800"
                  : "bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Total · {rangeLabel}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetricValue(total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Peak</p>
            <p className="flex items-center gap-1 text-lg font-semibold tabular-nums">
              <TrendingUpIcon className="size-4 text-violet-600" />
              {formatMetricValue(peak)}
            </p>
          </div>
          {isLoading ? (
            <Loader2Icon className="mb-1 size-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div
          ref={chartRef}
          className="relative"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => {
            setHoveredIndex(null);
            setEdgeScroll(null);
          }}
        >
          <div
            ref={scrollRef}
            className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <svg
              width={contentWidth}
              height={PLOT_HEIGHT}
              viewBox={`0 0 ${contentWidth} ${PLOT_HEIGHT}`}
              className="block"
              role="img"
              aria-label={ANALYTICS_MESSAGES.chartCallsTitle}
            >
              {yTicks.map((tick) => {
                const y =
                  CHART_PADDING.top +
                  (PLOT_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom) *
                    (1 - tick / maxValue);
                return (
                  <g key={`tick-${tick}`}>
                    <line
                      x1={CHART_PADDING.left}
                      x2={contentWidth - CHART_PADDING.right}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      className="text-border"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={CHART_PADDING.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {formatMetricValue(tick)}
                    </text>
                  </g>
                );
              })}

              {seriesKeys.map((key) => {
                const path = linePaths[key];
                if (!path) return null;
                return (
                  <path
                    key={`line-${key}`}
                    d={path}
                    fill="none"
                    stroke={SERIES_META[key].color}
                    strokeWidth={filter === "all" ? 2 : 2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

              {coordinates.map((coordinate, index) =>
                seriesKeys.map((key) => (
                  <circle
                    key={`${coordinate.point.key}-${key}`}
                    cx={coordinate.series[key].x}
                    cy={coordinate.series[key].y}
                    r={hoveredIndex === index ? 4.5 : 2.75}
                    fill={SERIES_META[key].color}
                    className="transition-[r]"
                  />
                )),
              )}

              {coordinates.map((coordinate, index) => {
                const showLabel =
                  days === 1
                    ? index % 4 === 0 || index === coordinates.length - 1
                    : true;
                if (!showLabel) return null;
                return (
                  <text
                    key={`label-${coordinate.point.key}`}
                    x={coordinate.x}
                    y={PLOT_HEIGHT - 2}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {coordinate.point.label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {filter === "all" ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-3">
            {ANALYTICS_CALL_SERIES_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SERIES_META[key].color }}
                />
                <span className="text-muted-foreground">
                  {SERIES_META[key].label}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>

      {hoveredCoordinate && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-50 min-w-[188px] rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
              style={getTooltipStyle(tooltipAnchor.x, tooltipAnchor.y)}
            >
              <p className="text-xs font-medium text-foreground">
                {hoveredCoordinate.point.timeLabel}
              </p>
              <div className="mt-2 space-y-1.5 border-t pt-2">
                {seriesKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: SERIES_META[key].color }}
                      />
                      <span className="truncate">{SERIES_META[key].label}</span>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatMetricValue(hoveredCoordinate.point.values[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </Card>
  );
}
