import { DASHBOARD_ROUTES } from "@/constants/routes";

export const ANALYTICS_PERIODS = ["24h", "7d", "14d", "30d"] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

/** @deprecated Tabs removed — single analytics page. Kept for legacy URL redirects. */
export type AnalyticsTab = "pulse" | "channels" | "sales" | "ai_ops";

export type AnalyticsUrlState = {
  period?: AnalyticsPeriod;
};

export function isAnalyticsPeriod(value: string): value is AnalyticsPeriod {
  return (ANALYTICS_PERIODS as readonly string[]).includes(value);
}

export function buildAnalyticsHref(state: AnalyticsUrlState = {}): string {
  const params = new URLSearchParams();

  if (state.period && state.period !== "7d") {
    params.set("period", state.period);
  }

  const query = params.toString();

  return query
    ? `${DASHBOARD_ROUTES.analytics}?${query}`
    : DASHBOARD_ROUTES.analytics;
}

export function parseAnalyticsSearchParams(input: {
  tab?: string;
  period?: string;
  channel?: string;
}): {
  activePeriod: AnalyticsPeriod;
} {
  if (input.period === "all") {
    return { activePeriod: "30d" };
  }

  const activePeriod =
    input.period && isAnalyticsPeriod(input.period) ? input.period : "7d";

  return { activePeriod };
}

export function analyticsPeriodToDays(period: AnalyticsPeriod): 1 | 7 | 14 | 30 {
  if (period === "24h") return 1;
  if (period === "14d") return 14;
  if (period === "30d") return 30;
  return 7;
}
