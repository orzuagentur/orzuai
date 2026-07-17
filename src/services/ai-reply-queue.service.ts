import "server-only";

import { createHash } from "crypto";

import { claimAiReplyJobs } from "@/lib/queue/claim-jobs";
import { dispatchAiReplyQueueWorker } from "@/lib/queue/qstash-ai-reply-worker";
import { scheduleAfterResponse } from "@/lib/queue/schedule-deferred";
import { sleep } from "@/lib/queue/sleep";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatSupabaseError } from "@/lib/supabase/format-error";
import {
  notifyAutoReplyError,
  notifyAutoReplyTyping,
} from "@/services/auto-reply-inbox-status.service";
import { isChannelAutoReplyEnabled } from "@/services/auto-reply-pipeline.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export const DEFAULT_AUTO_REPLY_DEBOUNCE_MS = 1_500;

const BATCH_SIZE = 20;
const MAX_DRAIN_BATCHES = 20;
const BASE_RETRY_SECONDS = 15;
/** Recover stuck jobs faster so a dead webhook drain cannot silence a chat for minutes. */
const STALE_PROCESSING_MS = 2 * 60 * 1000;
/** If a job stays processing this long, a new inbound may force it back to pending. */
const FORCE_REQUEUE_WHILE_PROCESSING_MS = 90_000;

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

/** @deprecated Use getBusinessReplyWaitMs */
export const AUTO_REPLY_DEBOUNCE_MS = DEFAULT_AUTO_REPLY_DEBOUNCE_MS;

/** Debounce window + small buffer so claim runs after job timer. */
function getDebouncedDrainDelayMs(replyWaitMs: number): number {
  return replyWaitMs + 250;
}

async function getBusinessReplyWaitMs(
  admin: MessagingDbClient,
  businessId: string,
  channel?: MessagingChannel,
): Promise<number> {
  if (channel) {
    const { data: channelRow } = await admin
      .from("ai_settings")
      .select("channel_overrides_enabled, reply_wait_ms")
      .eq("business_id", businessId)
      .eq("channel", channel)
      .maybeSingle();

    if (
      channelRow?.channel_overrides_enabled &&
      channelRow.reply_wait_ms != null
    ) {
      const waitMs = channelRow.reply_wait_ms;
      if (waitMs >= 1500 && waitMs <= 8000 && waitMs % 500 === 0) {
        return waitMs;
      }
    }
  }

  const { data } = await admin
    .from("ai_assistant_profile")
    .select("reply_wait_ms")
    .eq("business_id", businessId)
    .maybeSingle();

  const waitMs = data?.reply_wait_ms ?? DEFAULT_AUTO_REPLY_DEBOUNCE_MS;

  if (
    waitMs >= 1500 &&
    waitMs <= 8000 &&
    waitMs % 500 === 0
  ) {
    return waitMs;
  }

  return DEFAULT_AUTO_REPLY_DEBOUNCE_MS;
}

function combineClientMessages(messages: string[]): string {
  return messages
    .map((message) => message.trim())
    .filter(Boolean)
    .join("\n");
}

export function getAutoReplyDebounceMs(): number {
  return DEFAULT_AUTO_REPLY_DEBOUNCE_MS;
}

export async function resolveBusinessReplyWaitMs(
  admin: MessagingDbClient,
  businessId: string,
): Promise<number> {
  return getBusinessReplyWaitMs(admin, businessId);
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
  replyWaitMs: number,
): Promise<string | null> {
  const trimmed = input.clientMessage.trim();
  if (!trimmed) {
    return null;
  }

  const debouncedAt = new Date(Date.now() + replyWaitMs).toISOString();
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: existing, error: fetchError } = await admin
      .from("ai_reply_jobs")
      .select("id, status, pending_messages, needs_reprocess, updated_at")
      .eq("business_id", input.businessId)
      .eq("conversation_id", input.conversationId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existing) {
      const isProcessing = existing.status === "processing";
      const processingAgeMs = isProcessing
        ? Date.now() - new Date(existing.updated_at).getTime()
        : 0;
      const forceRequeue =
        isProcessing && processingAgeMs >= FORCE_REQUEUE_WHILE_PROCESSING_MS;
      const pendingMessages = [...(existing.pending_messages ?? []), trimmed];

      const { error: updateError } = await admin
        .from("ai_reply_jobs")
        .update({
          channel: input.channel,
          pending_messages: pendingMessages,
          next_attempt_at: debouncedAt,
          needs_reprocess: isProcessing && !forceRequeue
            ? true
            : existing.needs_reprocess,
          // Keep processing jobs claimable after a stuck worker dies.
          status: isProcessing && !forceRequeue ? "processing" : "pending",
          // Do not refresh updated_at while still processing — preserves stale recovery.
          ...(isProcessing && !forceRequeue ? {} : { updated_at: now }),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw updateError;
      }

      return existing.id;
    }

    const { data: inserted, error: insertError } = await admin
      .from("ai_reply_jobs")
      .insert({
        business_id: input.businessId,
        conversation_id: input.conversationId,
        channel: input.channel,
        pending_messages: [trimmed],
        next_attempt_at: debouncedAt,
        status: "pending",
      })
      .select("id")
      .single();

    if (!insertError) {
      return inserted.id;
    }

    if (insertError.code === "23505" && attempt === 0) {
      continue;
    }

    throw insertError;
  }

  return null;
}

function scheduleDebouncedAiReplyDrain(replyWaitMs: number): void {
  scheduleAfterResponse(getDebouncedDrainDelayMs(replyWaitMs), async () => {
    await drainAiReplyQueue().catch((error) => {
      console.error("[ai-reply-queue] deferred drain failed", error);
    });
  });
}

export async function dispatchAiReplyWorker(
  source: "enqueue" | "retry" = "enqueue",
  replyWaitMs: number = DEFAULT_AUTO_REPLY_DEBOUNCE_MS,
): Promise<{ qstashDispatched: boolean }> {
  scheduleDebouncedAiReplyDrain(replyWaitMs);
  const result = await dispatchAiReplyQueueWorker({
    source,
    delaySeconds: Math.ceil(replyWaitMs / 1000) + 1,
  });

  if (!result.dispatched) {
    console.warn(
      "[ai-reply-queue] QStash not configured; relying on deferred in-process drain and cron",
    );
  }

  return { qstashDispatched: result.dispatched };
}

export async function scheduleDebouncedChannelAutoReply(
  input: ChannelAutoReplyScheduleInput,
): Promise<void> {
  const trimmedMessage = input.clientMessage.trim();

  if (!trimmedMessage) {
    return;
  }

  const admin = createAdminClient();

  const aiEnabled = await isChannelAutoReplyEnabled({
    admin,
    businessId: input.businessId,
    channel: input.channel,
  });

  if (!aiEnabled) {
    console.warn(
      "[ai-reply-queue] skipped auto-reply: channel AI is off",
      JSON.stringify({
        businessId: input.businessId,
        channel: input.channel,
        conversationId: input.conversationId,
      }),
    );
    void notifyAutoReplyError(input.conversationId, {
      errorCode: "ai_disabled",
      errorMessage: "Auto-reply is off for this channel. Enable it in AI Agent → Channels.",
    });
    return;
  }

  const typingContext = {
    businessId: input.businessId,
    channel: input.channel,
    admin,
  };

  let replyWaitMs = DEFAULT_AUTO_REPLY_DEBOUNCE_MS;

  try {
    replyWaitMs = await getBusinessReplyWaitMs(
      admin,
      input.businessId,
      input.channel,
    );
    await upsertAiReplyJob(admin, input, replyWaitMs);
  } catch (error) {
    const message = formatSupabaseError(error);
    console.error(
      "[ai-reply-queue] failed to enqueue auto-reply job",
      JSON.stringify({
        businessId: input.businessId,
        channel: input.channel,
        conversationId: input.conversationId,
        error: message,
      }),
    );
    void notifyAutoReplyError(input.conversationId, {
      errorCode: "queue_enqueue_failed",
      errorMessage: "Auto-reply queue failed. Check server configuration.",
    });
    return;
  }

  await notifyAutoReplyTyping(input.conversationId, true, typingContext);

  // Register after()/QStash while the webhook request is still alive.
  const { qstashDispatched } = await dispatchAiReplyWorker(
    "enqueue",
    replyWaitMs,
  );

  // Without QStash, after() alone is not always enough on cold serverless —
  // drain inline after debounce so the first customer message still gets a reply.
  if (!qstashDispatched) {
    await sleep(getDebouncedDrainDelayMs(replyWaitMs));
    try {
      await drainAiReplyQueue();
    } catch (error) {
      console.error(
        "[ai-reply-queue] inline drain failed after enqueue",
        formatSupabaseError(error),
      );
    }
  }
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
    const replyWaitMs = await getBusinessReplyWaitMs(
      admin,
      job.business_id,
      job.channel,
    );

    await admin
      .from("ai_reply_jobs")
      .update({
        status: "pending",
        needs_reprocess: false,
        next_attempt_at: new Date(Date.now() + replyWaitMs).toISOString(),
        updated_at: now,
      })
      .eq("id", job.id);

    dispatchAiReplyWorker("retry", replyWaitMs);
    return "requeued";
  }

  if (outcome === "completed") {
    const { data: current } = await admin
      .from("ai_reply_jobs")
      .select("pending_messages, needs_reprocess")
      .eq("id", job.id)
      .maybeSingle();

    // Only requeue when real messages remain. needs_reprocess alone used to
    // requeue empty jobs and silently drop follow-up customer messages.
    const hasPendingMessages = (current?.pending_messages?.length ?? 0) > 0;

    if (hasPendingMessages) {
      const replyWaitMs = await getBusinessReplyWaitMs(
        admin,
        job.business_id,
        job.channel,
      );

      await admin
        .from("ai_reply_jobs")
        .update({
          status: "pending",
          needs_reprocess: false,
          next_attempt_at: new Date(Date.now() + replyWaitMs).toISOString(),
          processed_at: now,
          updated_at: now,
        })
        .eq("id", job.id);

      dispatchAiReplyWorker("retry", replyWaitMs);
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
        updated_at: now,
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
  const claimedMessages = [...(job.pending_messages ?? [])];
  const claimedCount = claimedMessages.length;
  const clientMessage = combineClientMessages(claimedMessages);

  if (!clientMessage) {
    await admin
      .from("ai_reply_jobs")
      .update({
        status: "completed",
        pending_messages: [],
        needs_reprocess: false,
        processed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await notifyAutoReplyTyping(job.conversation_id, false);
    return "completed";
  }

  await notifyAutoReplyTyping(job.conversation_id, true, {
    businessId: job.business_id,
    channel: job.channel,
    admin,
  });

  try {
    const { processChannelAutoReply } = await import("@/services/messaging.service");

    await processChannelAutoReply({
      admin,
      businessId: job.business_id,
      channel: job.channel,
      conversationId: job.conversation_id,
      clientMessage,
    });

    // Clear only messages this claim processed. Newer messages appended while
    // processing must stay in pending_messages for the next drain.
    const { data: current } = await admin
      .from("ai_reply_jobs")
      .select("pending_messages")
      .eq("id", job.id)
      .maybeSingle();

    const remainingMessages = (current?.pending_messages ?? []).slice(
      claimedCount,
    );

    await admin
      .from("ai_reply_jobs")
      .update({
        pending_messages: remainingMessages,
        needs_reprocess: remainingMessages.length > 0,
      })
      .eq("id", job.id);

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
    await notifyAutoReplyTyping(job.conversation_id, false, {
      businessId: job.business_id,
      channel: job.channel,
      admin,
    });
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
