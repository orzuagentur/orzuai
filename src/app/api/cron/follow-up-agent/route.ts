import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { runNoReplyCustomAutomations } from "@/services/automation-engine.service";
import { runDueConversationFollowUps } from "@/services/follow-up-agent.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "follow-up-agent", path: "/api/cron/follow-up-agent" },
    async () => {
      const [result, customNoReply] = await Promise.all([
        runDueConversationFollowUps(),
        runNoReplyCustomAutomations(),
      ]);

      return NextResponse.json({
        success: true,
        processed: result.processed,
        sent: result.sent,
        customNoReplyProcessed: customNoReply.processed,
        customNoReplyExecuted: customNoReply.executed,
      });
    },
  );
}
