import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { processVoiceCallQueue } from "@/services/voice-agent.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "voice-callbacks", path: "/api/cron/voice-callbacks" },
    async () => {
      const result = await processVoiceCallQueue();

      return NextResponse.json({
        success: true,
        processed: result.processed,
      });
    },
  );
}
