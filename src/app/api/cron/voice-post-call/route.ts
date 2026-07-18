import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { getVoiceHealthSnapshot } from "@/services/voice-health.service";
import { drainVoicePostCallQueue } from "@/services/voice-post-call-queue.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "voice-post-call", path: "/api/cron/voice-post-call" },
    async () => {
      const [result, health] = await Promise.all([
        drainVoicePostCallQueue(),
        getVoiceHealthSnapshot(),
      ]);

      return NextResponse.json({
        success: true,
        worker: "cron",
        result,
        health,
      });
    },
  );
}
