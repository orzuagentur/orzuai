import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentUser } from "@/services/auth.service";
import { getAnalyticsCallsSeries, getAnalyticsSeries } from "@/services/analytics-series.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  AnalyticsChartRangeDays,
  AnalyticsSeriesMetric,
} from "@/types/analytics-chart.types";

const METRICS: AnalyticsSeriesMetric[] = [
  "messages",
  "clients",
  "deals",
  "calls",
  "orders",
];

function parseDays(value: string | null): AnalyticsChartRangeDays {
  const parsed = Number(value);

  if (parsed === 1 || parsed === 7 || parsed === 14 || parsed === 30) {
    return parsed;
  }

  return 7;
}

function parseMetric(value: string | null): AnalyticsSeriesMetric | null {
  if (value && METRICS.includes(value as AnalyticsSeriesMetric)) {
    return value as AnalyticsSeriesMetric;
  }

  return null;
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing.", points: [] },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return NextResponse.json(
      { success: false, message: "Business not found.", points: [] },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const metric = parseMetric(searchParams.get("metric"));
  const days = parseDays(searchParams.get("days"));
  const format = searchParams.get("format");

  if (!metric) {
    return NextResponse.json(
      { success: false, message: "Invalid metric.", points: [] },
      { status: 400 },
    );
  }

  const points =
    metric === "calls" && format !== "area"
      ? await getAnalyticsCallsSeries(business.id, days)
      : await getAnalyticsSeries(business.id, metric, days);

  return NextResponse.json({
    success: true,
    metric,
    days,
    points,
  });
}
