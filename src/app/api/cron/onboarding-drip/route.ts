import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { runDueOnboardingDrips } from "@/services/onboarding-drip.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "onboarding-drip", path: "/api/cron/onboarding-drip" },
    async () => {
      const result = await runDueOnboardingDrips();

      return NextResponse.json({
        success: true,
        processed: result.processed,
        sent: result.sent,
        paused: result.paused,
      });
    },
  );
}
