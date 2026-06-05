import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import { runDueOnboardingDrips } from "@/services/onboarding-drip.service";

export async function GET(request: NextRequest) {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDueOnboardingDrips();

  return NextResponse.json({
    success: true,
    processed: result.processed,
    sent: result.sent,
  });
}
