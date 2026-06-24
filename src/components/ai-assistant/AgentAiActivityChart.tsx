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
  AgentActivityPoint,
  AgentActivityRangeDays,
} from "@/types/agent-dashboard.types";
import { formatMetricValue } from "@/utils/dashboard";

const RANGE_OPTIONS: Array<{ days: AgentActivityRangeDays; label: string }> = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

const CHART_PADDING = { top: 18, right: 16, bottom: 8, left: 44 };
const PLOT_HEIGHT = 196;
const EDGE_SCROLL_ZONE = 56;
const EDGE_SCROLL_SPEED = 2.5;
const TOOLTIP_OFFSET_ABOVE_POINT = 14;
const TOOLTIP_ESTIMATED_HEIGHT = 148;
const TOOLTIP_WIDTH = 168;
const TOOLTIP_EDGE_PADDING = 12;
const MIN_POINT_SPACING_24H = 54;
const MIN_POINT_SPACING_WEEK = 80;
const MIN_POINT_SPACING_MONTH = 44;

type AgentAiActivityChartProps = {
  initialPoints: AgentActivityPoint[];
  initialDays?: AgentActivityRangeDays;
};

type ChartCoordinate = {
  x: number;
  y: number;
  point: AgentActivityPoint;
};

type EdgeScrollDirection = "left" | "right" | null;

function ChannelActivityIcon({
  channel,
  className,
}: {
  channel: string;
  className?: string;
}) {
  if (channel === "phone") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-sky-100 text-[9px] font-semibold text-sky-700",
          className,
        )}
      >
        P
      </span>
    );
  }

  const isKnownChannel = INTEGRATION_CHANNEL_LIST.some((item) => item.id === channel);

  if (!isKnownChannel) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground",
          className,
        )}
      >
        ?
      </span>
    );
  }

  return (
    <ChannelBrandIcon
      channel={channel as (typeof INTEGRATION_CHANNEL_LIST)[number]["id"]}
      className={className}
    />
  );
}

function formatChannelLabel(channel: string): string {
  if (channel === "phone") {
    return "Phone";
  }

  const match = INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel);
  return match?.label ?? channel.replace(/_/g, " ");
}

function getPointSpacing(days: AgentActivityRangeDays): number {
  if (days === 1) {
    return MIN_POINT_SPACING_24H;
  }

  if (days <= 7) {
    return MIN_POINT_SPACING_WEEK;
  }

  return MIN_POINT_SPACING_MONTH;
}

function getTooltipStyle(anchorX: number, anchorY: number): CSSProperties {
  const half = TOOLTIP_WIDTH / 2;
  const offset = TOOLTIP_OFFSET_ABOVE_POINT;
  const padding = TOOLTIP_EDGE_PADDING;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchorX;
  let translateX = "-50%";

  if (anchorX - half < padding) {
    left = padding;
    translateX = "0";
  } else if (anchorX + half > viewportWidth - padding) {
    left = viewportWidth - padding;
    translateX = "-100%";
  }

  const topEdgeIfAbove = anchorY - offset - TOOLTIP_ESTIMATED_HEIGHT;
  const canShowAbove = topEdgeIfAbove >= padding;
  const canShowBelow =
    anchorY + offset + TOOLTIP_ESTIMATED_HEIGHT <= viewportHeight - padding;

  if (canShowAbove || !canShowBelow) {
    const top = canShowAbove
      ? anchorY
      : padding + TOOLTIP_ESTIMATED_HEIGHT + offset;

    return {
      position: "fixed",
      left,
      top,
      transform: `translate(${translateX}, calc(-100% - ${offset}px))`,
    };
  }

  const top = Math.min(
    anchorY + offset,
    viewportHeight - TOOLTIP_ESTIMATED_HEIGHT - padding,
  );

  return {
    position: "fixed",
    left,
    top,
    transform: `translateX(${translateX})`,
  };
}

function buildCoordinates(
  points: AgentActivityPoint[],
  contentWidth: number,
  maxValue: number,
): ChartCoordinate[] {
  if (points.length === 0) {
    return [];
  }

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
    .map((coordinate, index) => {
      return `${index === 0 ? "M" : "L"} ${coordinate.x} ${coordinate.y}`;
    })
    .join(" ");
}

function buildAreaPath(
  coordinates: ChartCoordinate[],
  baselineY: number,
): string {
  if (coordinates.length === 0) {
    return "";
  }

  const linePath = buildLinePath(coordinates);
  const last = coordinates[coordinates.length - 1];
  const first = coordinates[0];

  return `${linePath} L ${last?.x ?? 0} ${baselineY} L ${first?.x ?? 0} ${baselineY} Z`;
}

function ActivityTooltip({
  point,
  style,
}: {
  point: AgentActivityPoint;
  style: CSSProperties;
}) {
  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[168px] rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
      style={style}
    >
      <p className="text-xs font-medium text-foreground">{point.timeLabel}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {formatMetricValue(point.value)}{" "}
        <span className="text-sm font-normal text-muted-foreground">actions</span>
      </p>
      {point.channels.length > 0 ? (
        <div className="mt-2 space-y-1.5 border-t pt-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Channels
          </p>
          {point.channels.map((entry) => (
            <div
              key={`${point.key}-${entry.channel}`}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <ChannelActivityIcon channel={entry.channel} className="size-4" />
                <span className="truncate">{formatChannelLabel(entry.channel)}</span>
              </div>
              <span className="shrink-0 font-medium tabular-nums">
                {formatMetricValue(entry.count)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
          No channel activity in this period.
        </p>
      )}
    </div>
  );
}

function RangeTimePicker({
  days,
  isLoading,
  onChange,
}: {
  days: AgentActivityRangeDays;
  isLoading: boolean;
  onChange: (days: AgentActivityRangeDays) => void;
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
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 140);
  }, [cancelClose]);

  useEffect(() => {
    return () => {
      cancelClose();
    };
  }, [cancelClose]);

  const activeLabel =
    RANGE_OPTIONS.find((option) => option.days === days)?.label ?? "24 hours";

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

export function AgentAiActivityChart({
  initialPoints,
  initialDays = 1,
}: AgentAiActivityChartProps) {
  const [days, setDays] = useState<AgentActivityRangeDays>(initialDays);
  const [points, setPoints] = useState<AgentActivityPoint[]>(initialPoints);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState({ x: 0, y: 0 });
  const [edgeScroll, setEdgeScroll] = useState<EdgeScrollDirection>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(640);

  useEffect(() => {
    const node = chartRef.current;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (width && width > 0) {
        setViewportWidth(Math.floor(width));
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (days === initialDays) {
      setPoints(initialPoints);
      return;
    }

    let cancelled = false;

    async function loadActivity() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/ai-assistant/activity?days=${days}`);
        const payload = (await response.json()) as {
          success: boolean;
          points?: AgentActivityPoint[];
        };

        if (!cancelled && response.ok && payload.success) {
          setPoints(payload.points ?? []);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [days, initialDays, initialPoints]);

  useEffect(() => {
    if (!edgeScroll) {
      return;
    }

    let frame = 0;

    const tick = () => {
      const element = scrollRef.current;

      if (!element || !edgeScroll) {
        return;
      }

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

    return () => {
      window.cancelAnimationFrame(frame);
    };
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

    for (let value = 0; value <= maxValue; value += step) {
      ticks.push(value);
    }

    if (ticks[ticks.length - 1] !== maxValue) {
      ticks.push(maxValue);
    }

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

    if (!svg) {
      return;
    }

    const svgRect = svg.getBoundingClientRect();

    if (svgRect.width <= 0 || svgRect.height <= 0) {
      return;
    }

    setTooltipAnchor({
      x:
        svgRect.left +
        (coordinate.x / contentWidth) * svgRect.width,
      y:
        svgRect.top +
        (coordinate.y / PLOT_HEIGHT) * svgRect.height,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const scrollElement = scrollRef.current;
    const chartElement = chartRef.current;

    if (!scrollElement || !chartElement || coordinates.length === 0) {
      setHoveredIndex(null);
      setEdgeScroll(null);
      return;
    }

    const bounds = scrollElement.getBoundingClientRect();
    const xInView = event.clientX - bounds.left;
    const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;
    const canScrollLeft = scrollElement.scrollLeft > 0;
    const canScrollRight = scrollElement.scrollLeft < maxScroll - 1;

    if (canScrollHorizontally && xInView < EDGE_SCROLL_ZONE && canScrollLeft) {
      setEdgeScroll("left");
    } else if (
      canScrollHorizontally &&
      xInView > bounds.width - EDGE_SCROLL_ZONE &&
      canScrollRight
    ) {
      setEdgeScroll("right");
    } else {
      setEdgeScroll(null);
    }

    const xInContent = (() => {
      const svg = scrollElement.querySelector("svg");

      if (!svg) {
        return scrollElement.scrollLeft + xInView;
      }

      const svgRect = svg.getBoundingClientRect();

      if (svgRect.width <= 0) {
        return scrollElement.scrollLeft + xInView;
      }

      return ((event.clientX - svgRect.left) / svgRect.width) * contentWidth;
    })();
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
    const nearestCoordinate = coordinates[nearestIndex];

    if (nearestCoordinate) {
      updateTooltipAnchor(nearestCoordinate, scrollElement);
    }
  }

  function handlePointerLeave() {
    setHoveredIndex(null);
    setEdgeScroll(null);
  }

  function handleScrollPointerOut(event: React.PointerEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget as Node | null;

    if (!scrollRef.current?.contains(nextTarget)) {
      handlePointerLeave();
    }
  }

  useEffect(() => {
    const element = scrollRef.current;

    if (!element || points.length <= 1) {
      return;
    }

    element.scrollLeft = element.scrollWidth - element.clientWidth;
  }, [days, points.length, contentWidth]);

  return (
    <Card className="min-w-0 max-w-full overflow-hidden shadow-none">
      <CardHeader className="gap-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUpIcon className="size-5 text-violet-600" />
            AI activity
          </CardTitle>
          <CardDescription>
            Replies and phone AI actions by time. Hover a point for channel breakdown.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/15 px-4 py-3">
            <p className="text-xs text-muted-foreground">Total actions</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetricValue(total)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 px-4 py-3">
            <p className="text-xs text-muted-foreground">Peak period</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatMetricValue(peak)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/15 px-4 py-3">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-2xl font-semibold tabular-nums">
              {points.length > 0
                ? formatMetricValue(Math.round(total / points.length))
                : "0"}
            </p>
          </div>
        </div>

        <div
          ref={chartRef}
          className="relative w-full min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-50/90 to-background dark:from-slate-950/30"
        >
          {isLoading ? (
            <div className="flex h-[272px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading activity...
            </div>
          ) : points.length === 0 ? (
            <div className="flex h-[272px] items-center justify-center text-sm text-muted-foreground">
              No AI activity in this period yet.
            </div>
          ) : (
            <>
              <RangeTimePicker
                days={days}
                isLoading={isLoading}
                onChange={setDays}
              />

              <div
                ref={scrollRef}
                className="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain"
                onPointerMove={handlePointerMove}
                onPointerOut={handleScrollPointerOut}
                onPointerLeave={handlePointerLeave}
              >
                <div
                  className="relative box-border p-3 sm:p-4"
                  style={{ width: contentWidth }}
                >
                  <svg
                    width={contentWidth}
                    height={PLOT_HEIGHT}
                    className="block max-w-none"
                  >
                    <defs>
                      <linearGradient id="agentActivityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(124 58 237 / 0.28)" />
                        <stop offset="100%" stopColor="rgb(124 58 237 / 0.02)" />
                      </linearGradient>
                    </defs>

                    {yTicks.map((tick) => {
                      const plotHeight =
                        PLOT_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
                      const y =
                        CHART_PADDING.top + plotHeight - (tick / maxValue) * plotHeight;

                      return (
                        <g key={tick}>
                          <line
                            x1={CHART_PADDING.left}
                            y1={y}
                            x2={contentWidth - CHART_PADDING.right}
                            y2={y}
                            stroke="currentColor"
                            className="text-border/60"
                            strokeDasharray="3 5"
                          />
                          <text
                            x={CHART_PADDING.left - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-muted-foreground text-[10px]"
                          >
                            {tick}
                          </text>
                        </g>
                      );
                    })}

                    <path d={areaPath} fill="url(#agentActivityFill)" />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="rgb(124 58 237)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {hoveredCoordinate ? (
                      <line
                        x1={hoveredCoordinate.x}
                        y1={CHART_PADDING.top}
                        x2={hoveredCoordinate.x}
                        y2={baselineY}
                        stroke="rgb(124 58 237 / 0.35)"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    ) : null}

                    {coordinates.map((coordinate, index) => {
                      const isHovered = hoveredIndex === index;

                      return (
                        <circle
                          key={coordinate.point.key}
                          cx={coordinate.x}
                          cy={coordinate.y}
                          r={isHovered ? 6 : coordinate.point.value > 0 ? 4 : 2}
                          fill={isHovered ? "rgb(124 58 237)" : "white"}
                          stroke="rgb(124 58 237)"
                          strokeWidth={isHovered ? 0 : 2}
                        />
                      );
                    })}
                  </svg>

                  <div
                    className="relative mt-1 h-9"
                    style={{ width: contentWidth }}
                  >
                    {coordinates.map((coordinate) => (
                      <span
                        key={`${coordinate.point.key}-axis`}
                        className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] leading-4 text-muted-foreground tabular-nums"
                        style={{ left: coordinate.x }}
                      >
                        {coordinate.point.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {hoveredCoordinate && typeof document !== "undefined"
                ? createPortal(
                    <ActivityTooltip
                      point={hoveredCoordinate.point}
                      style={getTooltipStyle(tooltipAnchor.x, tooltipAnchor.y)}
                    />,
                    document.body,
                  )
                : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
