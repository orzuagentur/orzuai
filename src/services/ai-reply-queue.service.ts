import "server-only";

import { createHash } from "crypto";

import { claimAiReplyJobs } from "@/lib/queue/claim-jobs";
import { dispatchAiReplyQueueWorker } from "@/lib/queue/qstash-ai-reply-worker";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAutoReplyTyping } from "@/services/auto-reply-inbox-status.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export const AUTO_REPLY_DEBOUNCE_MS = 1_500;

const BATCH_SIZE = 20;
const MAX_DRAIN_BATCHES = 20;
const BASE_RETRY_SECONDS = 15;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

type AiReplyJobRow = Database["public"]["Tables"]["ai_reply_jobs"]["Row"];

export type AiReplyQueueDrainResult = {
  processed: number;
  completed: number;
  requeued: number;
  retried: number;
  failed: number;
  batches: number;
  recoveredStale: number;
  durationMs: number;
};

export type AiReplyQueueLagMetrics = {
  lagSeconds: number;
  oldestPendingAt: string | null;
  pendingCount: number;
  processingCount: number;
  staleProcessingCount: number;
  failedLast24h: number;
};

type ChannelAutoReplyScheduleInput = {
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
};

let replyDrainPromise: Promise<AiReplyQueueDrainResult> | null = null;

function combineClientMessages(messages: string[]): string {
  return messages
    .map((message) => message.trim())
    .filter(Boolean)
    .join("\n");
}

export function getAutoReplyDebounceMs(): number {
  return AUTO_REPLY_DEBOUNCE_MS;
}

export async function recoverStaleAiReplyJobs(): Promise<number> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data } = await admin
    .from("ai_reply_jobs")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("id");

  return data?.length ?? 0;
}

export async function getAiReplyQueueLagMetrics(): Promise<AiReplyQueueLagMetrics> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const failedSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [oldestPending, pendingCount, processingCount, staleProcessing, failedLast24h] =
    await Promise.all([
      admin
        .from("ai_reply_jobs")
        .select("next_attempt_at")
        .eq("status", "pending")
        .lte("next_attempt_at", now)
        .order("next_attempt_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      admin
        .from("ai_reply_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      admin
        .from("ai_reply_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing"),
      admin
        .from("ai_reply_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .lt("updated_at", staleBefore),
      admin
        .from("ai_reply_jobs")
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

async function upsertAiReplyJob(
  admin: MessagingDbClient,
  input: ChannelAutoReplyScheduleInput,
): Promise<string | null> {
  const { data, error } = await admin.rpc("upsert_ai_reply_job", {
    p_business_id: input.businessId,
    p_conversation_id: input.conversationId,
    p_channel: input.channel,
    p_message: input.clientMessage,
  });

  if (error) {
    throw error;
  }

  return data ?? null;
}

function scheduleAiReplyProcessingInProcess(): void {
  if (replyDrainPromise) {
    return;
  }

  replyDrainPromise = drainAiReplyQueue()
    .catch((error) => {
      console.error("[ai-reply-queue] in-process drain failed", error);
      return {
        processed: 0,
        completed: 0,
        requeued: 0,
        retried: 0,
        failed: 0,
        batches: 0,
        recoveredStale: 0,
        durationMs: 0,
      };
    })
    .finally(() => {
      replyDrainPromise = null;
    });
}

export function dispatchAiReplyWorker(
  source: "enqueue" | "retry" = "enqueue",
): void {
  scheduleAiReplyProcessingInProcess();
  void dispatchAiReplyQueueWorker({
    source,
    delaySeconds: Math.ceil(AUTO_REPLY_DEBOUNCE_MS / 1000) + 1,
  });
}

export async function scheduleDebouncedChannelAutoReply(
  input: ChannelAutoReplyScheduleInput,
): Promise<void> {
  const trimmedMessage = input.clientMessage.trim();

  if (!trimmedMessage) {
    return;
  }

  const admin = createAdminClient();
  await upsertAiReplyJob(admin, input);
  void notifyAutoReplyTyping(input.conversationId, true);
  dispatchAiReplyWorker("enqueue");
}

async function markAiReplyJobRetry(
  admin: MessagingDbClient,
  input: {
    id: string;
    attempt_count: number | null;
    max_attempts: number | null;
    error: string;
  },
): Promise<"retried" | "failed"> {
  const attemptCount = (input.attempt_count ?? 0) + 1;
  const maxAttempts = input.max_attempts ?? 5;
  const exhausted = attemptCount >= maxAttempts;

  await admin
    .from("ai_reply_jobs")
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

async function finalizeAiReplyJob(
  admin: MessagingDbClient,
  job: AiReplyJobRow,
  outcome: "completed" | "retried" | "failed" | "requeued",
): Promise<"completed" | "retried" | "failed" | "requeued"> {
  const now = new Date().toISOString();

  if (outcome === "requeued") {
    await admin
      .from("ai_reply_jobs")
      .update({
        status: "pending",
        needs_reprocess: false,
        next_attempt_at: new Date(
          Date.now() + AUTO_REPLY_DEBOUNCE_MS,
        ).toISOString(),
        updated_at: now,
      })
      .eq("id", job.id);

    dispatchAiReplyWorker("retry");
    return "requeued";
  }

  if (outcome === "completed") {
    const { data: current } = await admin
      .from("ai_reply_jobs")
      .select("pending_messages, needs_reprocess")
      .eq("id", job.id)
      .maybeSingle();

    const hasPendingMessages =
      (current?.pending_messages?.length ?? 0) > 0 || current?.needs_reprocess;

    if (hasPendingMessages) {
      await admin
        .from("ai_reply_jobs")
        .update({
          status: "pending",
          needs_reprocess: false,
          next_attempt_at: new Date(
            Date.now() + AUTO_REPLY_DEBOUNCE_MS,
          ).toISOString(),
          processed_at: now,
        })
        .eq("id", job.id);

      dispatchAiReplyWorker("retry");
      return "requeued";
    }

    await admin
      .from("ai_reply_jobs")
      .update({
        status: "completed",
        pending_messages: [],
        needs_reprocess: false,
        processed_at: now,
        last_error: null,
      })
      .eq("id", job.id);

    return "completed";
  }

  return outcome;
}

async function processClaimedAiReplyJob(
  admin: MessagingDbClient,
  job: AiReplyJobRow,
): Promise<"completed" | "retried" | "failed" | "requeued"> {
  const clientMessage = combineClientMessages(job.pending_messages ?? []);

  if (!clientMessage) {
    await admin
      .from("ai_reply_jobs")
      .update({
        status: "completed",
        pending_messages: [],
        processed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await notifyAutoReplyTyping(job.conversation_id, false);
    return "completed";
  }

  await admin
    .from("ai_reply_jobs")
    .update({ pending_messages: [] })
    .eq("id", job.id);

  try {
    const { processChannelAutoReply } = await import("@/services/messaging.service");

    await processChannelAutoReply({
      admin,
      businessId: job.business_id,
      channel: job.channel,
      conversationId: job.conversation_id,
      clientMessage,
    });

    return finalizeAiReplyJob(admin, job, "completed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auto-reply processing failed.";

    const outcome = await markAiReplyJobRetry(admin, {
      id: job.id,
      attempt_count: job.attempt_count,
      max_attempts: job.max_attempts,
      error: message,
    });

    if (outcome === "retried") {
      dispatchAiReplyWorker("retry");
    }

    return outcome;
  } finally {
    await notifyAutoReplyTyping(job.conversation_id, false);
  }
}

async function processPendingAiReplyJobs(): Promise<{
  processed: number;
  completed: number;
  requeued: number;
  retried: number;
  failed: number;
}> {
  const jobs = await claimAiReplyJobs(BATCH_SIZE);

  if (jobs.length === 0) {
    return { processed: 0, completed: 0, requeued: 0, retried: 0, failed: 0 };
  }

  const admin = createAdminClient();
  const concurrency = getWorkerConcurrency();
  const results = await runWithConcurrency(jobs, concurrency, (job) =>
    processClaimedAiReplyJob(admin, job),
  );

  return {
    processed: jobs.length,
    completed: results.filter((result) => result === "completed").length,
    requeued: results.filter((result) => result === "requeued").length,
    retried: results.filter((result) => result === "retried").length,
    failed: results.filter((result) => result === "failed").length,
  };
}

export async function drainAiReplyQueue(): Promise<AiReplyQueueDrainResult> {
  const startedAt = Date.now();
  const recoveredStale = await recoverStaleAiReplyJobs();

  const totals: AiReplyQueueDrainResult = {
    processed: 0,
    completed: 0,
    requeued: 0,
    retried: 0,
    failed: 0,
    batches: 0,
    recoveredStale,
    durationMs: 0,
  };

  let batch = await processPendingAiReplyJobs();

  while (batch.processed > 0 && totals.batches < MAX_DRAIN_BATCHES) {
    totals.batches += 1;
    totals.processed += batch.processed;
    totals.completed += batch.completed;
    totals.requeued += batch.requeued;
    totals.retried += batch.retried;
    totals.failed += batch.failed;

    if (batch.processed < BATCH_SIZE) {
      break;
    }

    batch = await processPendingAiReplyJobs();
  }

  totals.durationMs = Date.now() - startedAt;
  return totals;
}

export function buildAiOrchestrationIdempotencyKey(input: {
  conversationId: string;
  clientMessage: string;
}): string {
  const digest = createHash("sha256")
    .update(`${input.conversationId}:${input.clientMessage}`)
    .digest("hex")
    .slice(0, 32);

  return `orchestration:${input.conversationId}:${digest}`;
}
