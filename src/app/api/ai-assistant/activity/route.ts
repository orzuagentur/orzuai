import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentUser } from "@/services/auth.service";
import { getAgentAiActivity } from "@/services/agent-dashboard.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { AgentActivityRangeDays } from "@/types/agent-dashboard.types";

function parseDays(value: string | null): AgentActivityRangeDays {
  const parsed = Number(value);

  if (parsed === 1 || parsed === 7 || parsed === 14 || parsed === 30) {
    return parsed;
  }

  return 1;
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
  const days = parseDays(searchParams.get("days"));
  const points = await getAgentAiActivity(business.id, days);

  return NextResponse.json({
    success: true,
    days,
    points,
  });
}
