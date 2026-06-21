import { NextResponse, type NextRequest } from "next/server";

import { ENV_KEYS } from "@/constants/env-keys";
import { drainAiOrchestrationQueue } from "@/services/ai-orchestration-queue.service";
import { drainAiReplyQueue } from "@/services/ai-reply-queue.service";
import { getAiHealthSnapshot } from "@/services/ai-health.service";

export async function GET(request: NextRequest) {
  const cronSecret = process.env[ENV_KEYS.CRON_SECRET]?.trim();
  const authHeader = request.headers.get("authorization");
  const provided =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
