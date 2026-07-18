import { NextResponse, type NextRequest } from "next/server";

import { runAuthorizedCron } from "@/lib/cron/run-authorized-cron";
import { drainAiOrchestrationQueue } from "@/services/ai-orchestration-queue.service";
import { drainAiReplyQueue } from "@/services/ai-reply-queue.service";
import { getAiHealthSnapshot } from "@/services/ai-health.service";

export async function GET(request: NextRequest) {
  return runAuthorizedCron(
    request,
    { name: "ai-health", path: "/api/cron/ai-health" },
    async () => {
      const [replyQueue, orchestrationQueue, health] = await Promise.all([
        drainAiReplyQueue(),
        drainAiOrchestrationQueue(),
        getAiHealthSnapshot(),
      ]);

      return NextResponse.json({
        success: true,
        replyQueue,
        orchestrationQueue,
        health,
      });
    },
  );
}
