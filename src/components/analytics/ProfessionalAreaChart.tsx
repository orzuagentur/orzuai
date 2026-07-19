"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Clock3Icon, Loader2Icon, TrendingUpIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations";
import { cn } from "@/lib/utils";
import type {
  AnalyticsChartPoint,
  AnalyticsChartRangeDays,
  AnalyticsSeriesMetric,
} from "@/types/analytics-chart.types";
import { formatMetricValue } from "@/utils/dashboard";

const RANGE_OPTIONS: Array<{ days: AnalyticsChartRangeDays; label: string }> = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

const CHART_PADDING = { top: 18, right: 16, bottom: 8, left: 44 };
const PLOT_HEIGHT = 196;
const EDGE_SCROLL_ZONE = 56;
const EDGE_SCROLL_SPEED = 2.5;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_HEIGHT = 148;
const TOOLTIP_WIDTH = 176;
const TOOLTIP_PAD = 12;
const SPACING_24H = 54;
const SPACING_WEEK = 80;
const SPACING_MONTH = 44;

type ProfessionalAreaChartProps = {
  title: string;
  description: string;
  /** When set, period changes load live data from `/api/analytics/series`. */
  metric?: AnalyticsSeriesMetric;
  valueNoun: string;
  initialPoints: AnalyticsChartPoint[];
  initialDays?: AnalyticsChartRangeDays;
  accentClassName?: string;
  strokeColor?: string;
  fillId?: string;
  /** Extra header controls rendered left of the period clock. */
  headerActions?: ReactNode;
  showRangePicker?: boolean;
};

type ChartCoordinate = {
  x: number;
  y: number;
  point: AnalyticsChartPoint;
};

function SegmentIcon({ id, className }: { id: string; className?: string }) {
  if (id === "won") {
    return (
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-700",
          className,
        )}
      >
        W
      </span>
    );
  }

  if (id === "lost") {
    return (
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[9px] font-semibold text-rose-700",
          className,
        )}
      >
        L
      </span>
    );
  }

  const known = INTEGRATION_CHANNEL_LIST.some((item) => item.id === id);

  if (!known) {
    return (
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground",
          className,
        )}
      >
        ?
      </span>
    );
  }

  return (
    <ChannelBrandIcon
      channel={id as (typeof INTEGRATION_CHANNEL_LIST)[number]["id"]}
      className={cn("size-4", className)}
    />
  );
}

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
    top: Math.min(anchorY + TOOLTIP_OFFSET, viewportHeight - TOOLTIP_HEIGHT - TOOLTIP_PAD),
    transform: `translateX(${translateX})`,
  };
}

function buildCoordinates(
  points: AnalyticsChartPoint[],
  contentWidth: number,
  maxValue: number,
): ChartCoordinate[] {
  if (points.length === 0) return [];

  const plotWidth = contentWidth - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = PLOT_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  return points.map((point, index) => {
    const x = CHART_PADDING.left + index * stepX;
    const ratio = maxValue > 0 ? point.value / maxValue : 0;
    const y = CHART_PADDING.top + plotHeight - ratio * plotHeight;
    return { x, y, point };
  });
}

function buildLinePath(coordinates: ChartCoordinate[]): string {
  return coordinates
    .map((coordinate, index) =>
      `${index === 0 ? "M" : "L"} ${coordinate.x} ${coordinate.y}`,
    )
    .join(" ");
}

function buildAreaPath(coordinates: ChartCoordinate[], baselineY: number): string {
  if (coordinates.length === 0) return "";
  const linePath = buildLinePath(coordinates);
  const last = coordinates[coordinates.length - 1];
  const first = coordinates[0];
  return `${linePath} L ${last?.x ?? 0} ${baselineY} L ${first?.x ?? 0} ${baselineY} Z`;
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
      className="relative"
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
        {isLoading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <Clock3Icon className="size-4" />
        )}
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

function sliceTrailingPoints(
  points: AnalyticsChartPoint[],
  days: AnalyticsChartRangeDays,
): AnalyticsChartPoint[] {
  if (points.length === 0) {
    return [];
  }

  if (days === 1) {
    return points.slice(-1);
  }

  return points.slice(-Math.min(days, points.length));
}

export function ProfessionalAreaChart({
  title,
  description,
  metric,
  valueNoun,
  initialPoints,
  initialDays = 7,
  strokeColor = "rgb(124 58 237)",
  fillId = "analyticsAreaFill",
  headerActions,
  showRangePicker = true,
}: ProfessionalAreaChartProps) {
  const [days, setDays] = useState<AnalyticsChartRangeDays>(initialDays);
  const [points, setPoints] = useState(() =>
    metric ? initialPoints : sliceTrailingPoints(initialPoints, initialDays),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });
  const [edgeScroll, setEdgeScroll] = useState<"left" | "right" | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(640);

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
    if (!metric) {
      setPoints(sliceTrailingPoints(initialPoints, days));
      return;
    }

    if (days === initialDays) {
      setPoints(initialPoints);
      return;
    }

    let cancelled = false;

    async function loadSeries() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/analytics/series?metric=${metric}&days=${days}${
            metric === "calls" ? "&format=area" : ""
          }`,
        );
        const payload = (await response.json()) as {
          success: boolean;
          points?: AnalyticsChartPoint[];
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
  }, [days, initialDays, initialPoints, metric]);

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
      return Math.max(viewportWidth, CHART_PADDING.left + CHART_PADDING.right + 240);
    }
    return (
      CHART_PADDING.left +
      CHART_PADDING.right +
      (points.length - 1) * pointSpacing
    );
  }, [points.length, pointSpacing, viewportWidth]);

  const canScrollHorizontally = contentWidth > viewportWidth + 1;
  const total = useMemo(
    () => points.reduce((sum, point) => sum + point.value, 0),
    [points],
  );
  const peak = useMemo(
    () => Math.max(...points.map((point) => point.value), 0),
    [points],
  );
  const maxValue = Math.max(peak, 1);
  const yTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxValue / 4));
    const ticks: number[] = [];
    for (let value = 0; value <= maxValue; value += step) ticks.push(value);
    if (ticks[ticks.length - 1] !== maxValue) ticks.push(maxValue);
    return ticks;
  }, [maxValue]);

  const coordinates = useMemo(
    () => buildCoordinates(points, contentWidth, maxValue),
    [points, contentWidth, maxValue],
  );
  const linePath = buildLinePath(coordinates);
  const baselineY =
    CHART_PADDING.top + (PLOT_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom);
  const areaPath = buildAreaPath(coordinates, baselineY);
  const hoveredCoordinate =
    hoveredIndex != null ? coordinates[hoveredIndex] ?? null : null;

  function updateTooltipAnchor(
    coordinate: ChartCoordinate,
    scrollElement: HTMLDivElement,
  ) {
    const svg = scrollElement.querySelector("svg");
    if (!svg) return;
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width <= 0 || svgRect.height <= 0) return;
    setTooltipAnchor({
      x: svgRect.left + (coordinate.x / contentWidth) * svgRect.width,
      y: svgRect.top + (coordinate.y / PLOT_HEIGHT) * svgRect.height,
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
    if (nearest) updateTooltipAnchor(nearest, scrollElement);
  }

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.days === days)?.label ?? "7 days";

  const headerOffsetClass =
    headerActions || showRangePicker ? "pr-24" : undefined;

  return (
    <Card className="relative overflow-visible shadow-none">
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
        {headerActions}
        {showRangePicker ? (
          <RangePicker days={days} isLoading={isLoading} onChange={setDays} />
        ) : null}
      </div>
      <CardHeader className={cn("pb-2", headerOffsetClass)}>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              aria-label={title}
            >
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
                </linearGradient>
              </defs>

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

              {areaPath ? (
                <path d={areaPath} fill={`url(#${fillId})`} />
              ) : null}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {coordinates.map((coordinate, index) => (
                <circle
                  key={coordinate.point.key}
                  cx={coordinate.x}
                  cy={coordinate.y}
                  r={hoveredIndex === index ? 5 : 3.25}
                  fill={strokeColor}
                  className="transition-[r]"
                />
              ))}

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
      </CardContent>

      {hoveredCoordinate && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-50 min-w-[176px] rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
              style={getTooltipStyle(tooltipAnchor.x, tooltipAnchor.y)}
            >
              <p className="text-xs font-medium text-foreground">
                {hoveredCoordinate.point.timeLabel}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatMetricValue(hoveredCoordinate.point.value)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {valueNoun}
                </span>
              </p>
              {hoveredCoordinate.point.segments.length > 0 ? (
                <div className="mt-2 space-y-1.5 border-t pt-2">
                  {hoveredCoordinate.point.segments.map((segment) => (
                    <div
                      key={`${hoveredCoordinate.point.key}-${segment.id}`}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <SegmentIcon id={segment.id} />
                        <span className="truncate">{segment.label}</span>
                      </div>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatMetricValue(segment.count)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  No activity in this period.
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </Card>
  );
}
