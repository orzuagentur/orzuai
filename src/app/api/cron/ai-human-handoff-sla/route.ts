import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { escalateDueAiHumanRequests } from "@/services/ai-human-request.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "ai-human-handoff-sla", path: "/api/cron/ai-human-handoff-sla" },
    async () => {
      const result = await escalateDueAiHumanRequests();

      return NextResponse.json({
        success: true,
        processed: result.processed,
        escalated: result.escalated,
      });
    },
  );
}
