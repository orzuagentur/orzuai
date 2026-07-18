import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { getVoiceHealthSnapshot } from "@/services/voice-health.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "voice-health", path: "/api/cron/voice-health" },
    async () => {
      const health = await getVoiceHealthSnapshot();

      return NextResponse.json({
        success: true,
        health,
      });
    },
  );
}
