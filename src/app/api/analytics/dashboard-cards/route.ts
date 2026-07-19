import { NextResponse } from "next/server";

import {
  DASHBOARD_CARD_PERIOD_OPTIONS,
} from "@/features/dashboard/metric-cards";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getDashboardCardMetricValues } from "@/services/dashboard-home-metrics.service";
import type { DashboardCardPeriod } from "@/types/dashboard-home.types";

function parsePeriod(value: string | null): DashboardCardPeriod {
  if (
    value &&
    DASHBOARD_CARD_PERIOD_OPTIONS.some((option) => option.id === value)
  ) {
    return value as DashboardCardPeriod;
  }
  return "week";
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { success: false, message: "Configuration missing." },
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
      { success: false, message: "Business not found." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams.get("period"));
  const values = await getDashboardCardMetricValues(business.id, period);

  return NextResponse.json({ success: true, period, values });
}
