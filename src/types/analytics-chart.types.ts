export type AnalyticsChartRangeDays = 1 | 7 | 14 | 30;

export type AnalyticsChartSegment = {
  id: string;
  label: string;
  count: number;
};

export type AnalyticsChartPoint = {
  key: string;
  label: string;
  timeLabel: string;
  value: number;
  segments: AnalyticsChartSegment[];
};

export type AnalyticsSeriesMetric =
  | "messages"
  | "clients"
  | "deals"
  | "calls"
  | "orders";


export type AnalyticsCallSeriesKey =
  | "ai"
  | "manager"
  | "general"
  | "inbound"
  | "outbound";

export type AnalyticsCallFilter = "all" | AnalyticsCallSeriesKey;

export type AnalyticsCallsChartPoint = {
  key: string;
  label: string;
  timeLabel: string;
  values: Record<AnalyticsCallSeriesKey, number>;
};

export const ANALYTICS_CALL_SERIES_KEYS: AnalyticsCallSeriesKey[] = [
  "ai",
  "manager",
  "general",
  "inbound",
  "outbound",
];
