import "server-only";

import { claimAiOrchestrationJobs } from "@/lib/queue/claim-jobs";
import { dispatchAiOrchestrationQueueWorker } from "@/lib/queue/qstash-ai-orchestration-worker";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutoReplyBackgroundOrchestration } from "@/services/auto-reply-pipeline.service";
import { sendChannelAutoReplyText } from "@/services/channels/channel-auto-reply-send.service";
import { buildAiOrchestrationIdempotencyKey } from "@/services/ai-reply-queue.service";
import { sanitizeCustomerFacingSummary } from "@/utils/customer-facing-agent-summary";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

const BATCH_SIZE = 20;
const MAX_DRAIN_BATCHES = 20;
const BASE_RETRY_SECONDS = 30;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

type AiOrchestrationJobRow =
  Database["public"]["Tables"]["ai_orchestration_jobs"]["Row"];

export type AiOrchestrationQueueDrainResult = {
  processed: number;
  completed: number;
  retried: number;
  failed: number;
  duplicate: number;
  batches: number;
  recoveredStale: number;
  durationMs: number;
};

export type AiOrchestrationQueueLagMetrics = {
  lagSeconds: number;
  oldestPendingAt: string | null;
  pendingCount: number;
  processingCount: number;
  staleProcessingCount: number;
  failedLast24h: number;
};

let orchestrationDrainPromise: Promise<AiOrchestrationQueueDrainResult> | null =
  null;

export async function recoverStaleAiOrchestrationJobs(): Promise<number> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data } = await admin
    .from("ai_orchestration_jobs")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("id");

  return data?.length ?? 0;
}

export async function getAiOrchestrationQueueLagMetrics(): Promise<AiOrchestrationQueueLagMetrics> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const failedSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [oldestPending, pendingCount, processingCount, staleProcessing, failedLast24h] =
    await Promise.all([
      admin
        .from("ai_orchestration_jobs")
        .select("next_attempt_at")
        .eq("status", "pending")
        .lte("next_attempt_at", now)
        .order("next_attempt_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      admin
        .from("ai_orchestration_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("ai_orchestration_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing"),
      admin
        .from("ai_orchestration_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .lt("updated_at", staleBefore),
      admin
        .from("ai_orchestration_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("updated_at", failedSince),
    ]);

  const oldestPendingAt = oldestPending.data?.next_attempt_at ?? null;
  const lagSeconds = oldestPendingAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(oldestPendingAt).getTime()) / 1000),
      )
    : 0;

  return {
    lagSeconds,
    oldestPendingAt,
    pendingCount: pendingCount.count ?? 0,
    processingCount: processingCount.count ?? 0,
    staleProcessingCount: staleProcessing.count ?? 0,
    failedLast24h: failedLast24h.count ?? 0,
  };
}

export async function enqueueAiOrchestrationJob(input: {
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
}): Promise<{ enqueued: boolean; duplicate: boolean }> {
  const admin = createAdminClient();
  const idempotencyKey = buildAiOrchestrationIdempotencyKey({
    conversationId: input.conversationId,
    clientMessage: input.clientMessage,
  });

  const { error } = await admin.from("ai_orchestration_jobs").insert({
    business_id: input.businessId,
    conversation_id: input.conversationId,
    channel: input.channel,
    client_message: input.clientMessage,
    idempotency_key: idempotencyKey,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { enqueued: false, duplicate: true };
    }

    throw error;
  }

  dispatchAiOrchestrationWorker("enqueue");
  return { enqueued: true, duplicate: false };
}

function scheduleAiOrchestrationProcessingInProcess(): void {
  if (orchestrationDrainPromise) {
    return;
  }

  orchestrationDrainPromise = drainAiOrchestrationQueue()
    .catch((error) => {
      console.error("[ai-orchestration-queue] in-process drain failed", error);
      return {
        processed: 0,
        completed: 0,
        retried: 0,
        failed: 0,
        duplicate: 0,
        batches: 0,
        recoveredStale: 0,
        durationMs: 0,
      };
    })
    .finally(() => {
      orchestrationDrainPromise = null;
    });
}

export function dispatchAiOrchestrationWorker(
  source: "enqueue" | "retry" = "enqueue",
): void {
  scheduleAiOrchestrationProcessingInProcess();
  void dispatchAiOrchestrationQueueWorker({ source });
}

async function markAiOrchestrationJobRetry(
  admin: MessagingDbClient,
  input: {
    id: string;
    attempt_count: number | null;
    max_attempts: number | null;
    error: string;
  },
): Promise<"retried" | "failed"> {
  const attemptCount = (input.attempt_count ?? 0) + 1;
  const maxAttempts = input.max_attempts ?? 3;
  const exhausted = attemptCount >= maxAttempts;

  await admin
    .from("ai_orchestration_jobs")
    .update({
      status: exhausted ? "failed" : "pending",
      attempt_count: attemptCount,
      last_error: input.error,
      next_attempt_at: new Date(
        Date.now() + BASE_RETRY_SECONDS * 1000 * 2 ** (attemptCount - 1),
      ).toISOString(),
    })
    .eq("id", input.id);

  return exhausted ? "failed" : "retried";
}

async function processClaimedAiOrchestrationJob(
  admin: MessagingDbClient,
  job: AiOrchestrationJobRow,
): Promise<"completed" | "retried" | "failed"> {
  const now = new Date().toISOString();

  try {
    const { data: profile } = await admin
      .from("ai_assistant_profile")
      .select("language")
      .eq("business_id", job.business_id)
      .maybeSingle();

    const language = profile?.language?.trim() || "English";

    await runAutoReplyBackgroundOrchestration({
      admin,
      businessId: job.business_id,
      channel: job.channel,
      conversationId: job.conversation_id,
      clientMessage: job.client_message,
      language,
      sendFollowUp: async (text) => {
        const customerText = sanitizeCustomerFacingSummary(text);

        if (!customerText) {
          return { success: true };
        }

        const result = await sendChannelAutoReplyText({
          admin,
          businessId: job.business_id,
          channel: job.channel,
          conversationId: job.conversation_id,
          text: customerText,
        });

        if (result.success) {
          const { insertChannelMessage, incrementMessagingAnalytics } =
            await import("@/services/messaging.service");

          await insertChannelMessage(admin, {
            conversationId: job.conversation_id,
            channel: job.channel,
            senderType: "ai",
            content: customerText,
            aiGenerated: true,
          });

          await incrementMessagingAnalytics(admin, job.business_id, job.channel, {
            totalMessages: 1,
            aiReplies: 1,
          });
        }

        return { success: result.success };
      },
    });

    await admin
      .from("ai_orchestration_jobs")
      .update({
        status: "completed",
        processed_at: now,
        last_error: null,
      })
      .eq("id", job.id);

    return "completed";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Orchestration processing failed.";

    const outcome = await markAiOrchestrationJobRetry(admin, {
      id: job.id,
      attempt_count: job.attempt_count,
      max_attempts: job.max_attempts,
      error: message,
    });

    if (outcome === "retried") {
      dispatchAiOrchestrationWorker("retry");
    }

    return outcome;
  }
}

async function processPendingAiOrchestrationJobs(): Promise<{
  processed: number;
  completed: number;
  retried: number;
  failed: number;
}> {
  const jobs = await claimAiOrchestrationJobs(BATCH_SIZE);

  if (jobs.length === 0) {
    return { processed: 0, completed: 0, retried: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const concurrency = getWorkerConcurrency();
  const results = await runWithConcurrency(jobs, concurrency, (job) =>
    processClaimedAiOrchestrationJob(admin, job),
  );

  return {
    processed: jobs.length,
    completed: results.filter((result) => result === "completed").length,
    retried: results.filter((result) => result === "retried").length,
    failed: results.filter((result) => result === "failed").length,
  };
}

export async function drainAiOrchestrationQueue(): Promise<AiOrchestrationQueueDrainResult> {
  const startedAt = Date.now();
  const recoveredStale = await recoverStaleAiOrchestrationJobs();

  const totals: AiOrchestrationQueueDrainResult = {
    processed: 0,
    completed: 0,
    retried: 0,
    failed: 0,
    duplicate: 0,
    batches: 0,
    recoveredStale,
    durationMs: 0,
  };

  let batch = await processPendingAiOrchestrationJobs();

  while (batch.processed > 0 && totals.batches < MAX_DRAIN_BATCHES) {
    totals.batches += 1;
    totals.processed += batch.processed;
    totals.completed += batch.completed;
    totals.retried += batch.retried;
    totals.failed += batch.failed;

    if (batch.processed < BATCH_SIZE) {
      break;
    }

    batch = await processPendingAiOrchestrationJobs();
  }

  totals.durationMs = Date.now() - startedAt;
  return totals;
}
