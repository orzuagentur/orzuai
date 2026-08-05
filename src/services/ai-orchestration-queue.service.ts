import "server-only";

import { claimAiOrchestrationJobs } from "@/lib/queue/claim-jobs";
import { dispatchAiOrchestrationQueueWorker } from "@/lib/queue/qstash-ai-orchestration-worker";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import {
  getAiOrchestrationQueueBatchSize,
  getAiQueueMaxDrainBatches,
} from "@/lib/queue/worker-tuning";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAutoReplyBackgroundOrchestration } from "@/services/auto-reply-pipeline.service";
import { sendChannelAutoReplyText } from "@/services/channels/channel-auto-reply-send.service";
import { buildAiOrchestrationIdempotencyKey } from "@/services/ai-reply-queue.service";
import { schedulePlatformErrorReport } from "@/services/error-intelligence.service";
import { sanitizeCustomerFacingSummary } from "@/utils/customer-facing-agent-summary";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

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

const IDLE_CRM_DELAY_MS = 5 * 60 * 1000;

export function buildIdleCrmOrchestrationIdempotencyKey(
  conversationId: string,
): string {
  return `idle:${conversationId}`;
}

export async function enqueueAiOrchestrationJob(input: {
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
  idempotencyKey?: string;
  nextAttemptAt?: Date;
}): Promise<{ enqueued: boolean; duplicate: boolean }> {
  const admin = createAdminClient();
  const idempotencyKey =
    input.idempotencyKey ??
    buildAiOrchestrationIdempotencyKey({
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
    next_attempt_at: (input.nextAttemptAt ?? new Date()).toISOString(),
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

async function enqueueIdleCrmOrchestrationJob(input: {
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
}): Promise<{ enqueued: boolean; duplicate: boolean; deferred: boolean }> {
  const admin = createAdminClient();
  const idempotencyKey = buildIdleCrmOrchestrationIdempotencyKey(
    input.conversationId,
  );
  const nextAttemptAt = new Date(Date.now() + IDLE_CRM_DELAY_MS).toISOString();

  const { data: existing } = await admin
    .from("ai_orchestration_jobs")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("ai_orchestration_jobs")
      .update({
        business_id: input.businessId,
        conversation_id: input.conversationId,
        channel: input.channel,
        client_message: input.clientMessage,
        status: "pending",
        attempt_count: 0,
        last_error: null,
        processed_at: null,
        next_attempt_at: nextAttemptAt,
      })
      .eq("id", existing.id);

    dispatchAiOrchestrationWorker("enqueue");
    return { enqueued: true, duplicate: false, deferred: true };
  }

  const inserted = await enqueueAiOrchestrationJob({
    ...input,
    idempotencyKey,
    nextAttemptAt: new Date(nextAttemptAt),
  });

  return { ...inserted, deferred: true };
}

/**
 * Schedules CRM orchestration according to the business crm_update_mode.
 * - every_message: enqueue immediately (default)
 * - idle_5min: upsert conversation-scoped pending job delayed 5 minutes
 * - on_resolve: no-op here; enqueue when conversation becomes resolved/closed
 */
export async function scheduleCrmOrchestration(input: {
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
}): Promise<{
  enqueued: boolean;
  duplicate: boolean;
  deferred: boolean;
  skipped: boolean;
  mode: "every_message" | "idle_5min" | "on_resolve";
}> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("ai_assistant_profile")
    .select("crm_update_mode")
    .eq("business_id", input.businessId)
    .maybeSingle();

  const mode =
    profile?.crm_update_mode === "idle_5min" ||
    profile?.crm_update_mode === "on_resolve"
      ? profile.crm_update_mode
      : "every_message";

  if (mode === "on_resolve") {
    return {
      enqueued: false,
      duplicate: false,
      deferred: false,
      skipped: true,
      mode,
    };
  }

  if (mode === "idle_5min") {
    const result = await enqueueIdleCrmOrchestrationJob(input);
    return { ...result, skipped: false, mode };
  }

  const result = await enqueueAiOrchestrationJob(input);
  return { ...result, deferred: false, skipped: false, mode };
}

export async function enqueueCrmOrchestrationOnResolve(input: {
  businessId: string;
  conversationId: string;
}): Promise<{ enqueued: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("ai_assistant_profile")
    .select("crm_update_mode")
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (profile?.crm_update_mode !== "on_resolve") {
    return { enqueued: false, reason: "mode_not_on_resolve" };
  }

  const { data: conversation } = await admin
    .from("conversations")
    .select("channel")
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (!conversation?.channel) {
    return { enqueued: false, reason: "conversation_missing" };
  }

  const { data: lastClientMessage } = await admin
    .from("messages")
    .select("content")
    .eq("conversation_id", input.conversationId)
    .eq("sender_type", "client")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const clientMessage = lastClientMessage?.content?.trim();

  if (!clientMessage) {
    return { enqueued: false, reason: "no_client_message" };
  }

  const result = await enqueueAiOrchestrationJob({
    businessId: input.businessId,
    channel: conversation.channel,
    conversationId: input.conversationId,
    clientMessage,
  });

  return { enqueued: result.enqueued || result.duplicate };
}

function scheduleAiOrchestrationProcessingInProcess(): void {
  if (orchestrationDrainPromise) {
    return;
  }

  orchestrationDrainPromise = drainAiOrchestrationQueue()
    .catch((error) => {
      console.error("[ai-orchestration-queue] in-process drain failed", error);
      schedulePlatformErrorReport({
        severity: "high",
        module: "ai",
        category: "ai-orchestration-queue",
        source: "ai-orchestration-queue",
        title: "AI orchestration drain failed",
        message: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack ?? null : null,
      });
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

  if (exhausted) {
    schedulePlatformErrorReport({
      severity: "high",
      module: "ai",
      category: "ai-orchestration-queue",
      source: "ai-orchestration-queue",
      title: "AI orchestration job exhausted retries",
      message: input.error,
      context: {
        jobId: input.id,
        attemptCount,
        maxAttempts,
      },
      retryCount: attemptCount,
      rootCause: "Background AI orchestration failed until max attempts.",
      suggestedFix: "Inspect ai_orchestration_jobs.last_error and orchestrator logs.",
    });
  }

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

    const sendFollowUp = async (text: string) => {
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
          content: result.sentText ?? customerText,
          aiGenerated: true,
        });

        await incrementMessagingAnalytics(admin, job.business_id, job.channel, {
          totalMessages: 1,
          aiReplies: 1,
        });
      }

      return { success: result.success };
    };

    if (job.channel === "voice") {
      const { runVoiceCrmOrchestrationFromQueue } = await import(
        "@/services/voice-orchestrator.service"
      );

      await runVoiceCrmOrchestrationFromQueue({
        businessId: job.business_id,
        conversationId: job.conversation_id,
        clientMessage: job.client_message,
      });
    } else {
      await runAutoReplyBackgroundOrchestration({
        admin,
        businessId: job.business_id,
        channel: job.channel,
        conversationId: job.conversation_id,
        clientMessage: job.client_message,
        language,
        sendFollowUp,
      });
    }

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
  const jobs = await claimAiOrchestrationJobs(getAiOrchestrationQueueBatchSize());

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

  while (batch.processed > 0 && totals.batches < getAiQueueMaxDrainBatches()) {
    totals.batches += 1;
    totals.processed += batch.processed;
    totals.completed += batch.completed;
    totals.retried += batch.retried;
    totals.failed += batch.failed;

    if (batch.processed < getAiOrchestrationQueueBatchSize()) {
      break;
    }

    batch = await processPendingAiOrchestrationJobs();
  }

  totals.durationMs = Date.now() - startedAt;
  return totals;
}
