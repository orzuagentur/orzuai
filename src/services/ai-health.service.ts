import "server-only";

import { hasGeminiEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAiOrchestrationQueueLagMetrics,
  type AiOrchestrationQueueLagMetrics,
} from "@/services/ai-orchestration-queue.service";
import {
  getAiReplyQueueLagMetrics,
  type AiReplyQueueLagMetrics,
} from "@/services/ai-reply-queue.service";
import { getProviderAvailability } from "@/services/llm.service";

export type AiHealthSnapshot = {
  replyQueue: AiReplyQueueLagMetrics;
  orchestrationQueue: AiOrchestrationQueueLagMetrics;
  providers: ReturnType<typeof getProviderAvailability>;
  failedOrchestratorRuns24h: number;
  geminiConfigured: boolean;
  capturedAt: string;
};

export async function getAiHealthSnapshot(): Promise<AiHealthSnapshot> {
  const [replyQueue, orchestrationQueue, failedOrchestratorRuns24h] =
    await Promise.all([
      getAiReplyQueueLagMetrics(),
      getAiOrchestrationQueueLagMetrics(),
      countFailedOrchestratorRuns24h(),
    ]);

  return {
    replyQueue,
    orchestrationQueue,
    providers: getProviderAvailability(),
    failedOrchestratorRuns24h,
    geminiConfigured: hasGeminiEnv(),
    capturedAt: new Date().toISOString(),
  };
}

async function countFailedOrchestratorRuns24h(): Promise<number> {
  if (!hasSupabaseEnv()) {
    return 0;
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count } = await admin
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("success", false)
    .gte("created_at", since);

  return count ?? 0;
}
