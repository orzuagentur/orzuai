import "server-only";

import { createHash } from "crypto";

import { dispatchWebhookQueueWorker } from "@/lib/queue/qstash-webhook-worker";
import { claimInboundWebhookJobs } from "@/lib/queue/claim-jobs";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { createAdminClient } from "@/lib/supabase/admin";
import { processInstagramWebhook } from "@/services/instagram.service";
import { processTelegramWebhook } from "@/services/telegram.service";
import { processWhatsAppWebhook } from "@/services/whatsapp.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { InstagramWebhookPayload } from "@/types/instagram.types";
import type { TelegramWebhookPayload } from "@/types/telegram.types";
import type { WhatsAppWebhookPayload } from "@/types/whatsapp.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

const BATCH_SIZE = 20;
const BASE_RETRY_SECONDS = 15;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

export type WebhookQueueDrainResult = {
  processed: number;
  completed: number;
  retried: number;
  failed: number;
  batches: number;
  recoveredStale: number;
};

export type WebhookQueueLagMetrics = {
  lagSeconds: number;
  oldestPendingAt: string | null;
  staleProcessingCount: number;
};

export function buildWebhookIdempotencyKey(
  channel: MessagingChannel,
  rawBody: string,
): string {
  const digest = createHash("sha256").update(rawBody).digest("hex");
  return `${channel}:${digest}`;
}

export async function enqueueInboundWebhook(
  admin: MessagingDbClient,
  input: {
    channel: MessagingChannel;
    idempotencyKey: string;
    payload: unknown;
    metadata?: Record<string, unknown>;
  },
): Promise<{ queued: boolean; duplicate: boolean }> {
  const { error } = await admin.from("inbound_webhook_queue").insert({
    channel: input.channel,
    idempotency_key: input.idempotencyKey,
    payload: input.payload as Database["public"]["Tables"]["inbound_webhook_queue"]["Insert"]["payload"],
    metadata: (input.metadata ?? {}) as Database["public"]["Tables"]["inbound_webhook_queue"]["Insert"]["metadata"],
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      dispatchInboundWebhookWorker();
      return { queued: false, duplicate: true };
    }

    throw error;
  }

  dispatchInboundWebhookWorker();
  return { queued: true, duplicate: false };
}

let webhookDrainPromise: Promise<WebhookQueueDrainResult> | null = null;

export async function recoverStaleWebhookJobs(): Promise<number> {
  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const { data } = await admin
    .from("inbound_webhook_queue")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("id");

  return data?.length ?? 0;
}

export async function getWebhookQueueLagMetrics(): Promise<WebhookQueueLagMetrics> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const [oldestPending, staleProcessing] = await Promise.all([
    admin
      .from("inbound_webhook_queue")
      .select("created_at")
      .eq("status", "pending")
      .lte("next_attempt_at", now)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("inbound_webhook_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing")
      .lt("updated_at", staleBefore),
  ]);

  const oldestPendingAt = oldestPending.data?.created_at ?? null;
  const lagSeconds = oldestPendingAt
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(oldestPendingAt).getTime()) / 1000,
        ),
      )
    : 0;

  return {
    lagSeconds,
    oldestPendingAt,
    staleProcessingCount: staleProcessing.count ?? 0,
  };
}

export async function drainInboundWebhookQueue(): Promise<WebhookQueueDrainResult> {
  const recoveredStale = await recoverStaleWebhookJobs();

  const totals: WebhookQueueDrainResult = {
    processed: 0,
    completed: 0,
    retried: 0,
    failed: 0,
    batches: 0,
    recoveredStale,
  };

  let batch = await processPendingInboundWebhooks();

  while (batch.processed > 0) {
    totals.batches += 1;
    totals.processed += batch.processed;
    totals.completed += batch.completed;
    totals.retried += batch.retried;
    totals.failed += batch.failed;

    if (batch.processed < BATCH_SIZE) {
      break;
    }

    batch = await processPendingInboundWebhooks();
  }

  return totals;
}

function scheduleInboundWebhookProcessingInProcess(): void {
  if (webhookDrainPromise) {
    return;
  }

  webhookDrainPromise = drainInboundWebhookQueue()
    .catch((error) => {
      console.error("[webhook-queue] in-process drain failed", error);
      return {
        processed: 0,
        completed: 0,
        retried: 0,
        failed: 0,
        batches: 0,
        recoveredStale: 0,
      };
    })
    .finally(() => {
      webhookDrainPromise = null;
    });
}

export function dispatchInboundWebhookWorker(): void {
  scheduleInboundWebhookProcessingInProcess();
  void dispatchWebhookQueueWorker("enqueue");
}

/** @deprecated Use dispatchInboundWebhookWorker */
export function scheduleInboundWebhookProcessing(): void {
  dispatchInboundWebhookWorker();
}

async function processWebhookJob(job: {
  id: string;
  channel: MessagingChannel;
  payload: unknown;
  metadata: Record<string, unknown> | null;
}): Promise<{ success: boolean; error?: string }> {
  if (job.channel === "whatsapp") {
    const result = await processWhatsAppWebhook(
      job.payload as WhatsAppWebhookPayload,
    );
    return { success: true, error: result.processed === 0 ? "No messages" : undefined };
  }

  if (job.channel === "telegram") {
    const secretToken =
      typeof job.metadata?.secretToken === "string"
        ? job.metadata.secretToken
        : "";

    if (!secretToken) {
      return { success: false, error: "Missing Telegram secret token." };
    }

    await processTelegramWebhook(
      secretToken,
      job.payload as TelegramWebhookPayload,
    );
    return { success: true };
  }

  if (job.channel === "instagram") {
    await processInstagramWebhook(job.payload as InstagramWebhookPayload);
    return { success: true };
  }

  return { success: false, error: `Unsupported channel: ${job.channel}` };
}

async function processClaimedWebhookJob(job: {
  id: string;
  channel: MessagingChannel;
  payload: unknown;
  metadata: Record<string, unknown> | null;
  attempt_count: number | null;
  max_attempts: number | null;
}): Promise<"completed" | "retried" | "failed"> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const result = await processWebhookJob({
    id: job.id,
    channel: job.channel,
    payload: job.payload,
    metadata: job.metadata,
  });

  if (result.success) {
    await admin
      .from("inbound_webhook_queue")
      .update({
        status: "completed",
        processed_at: now,
        last_error: result.error ?? null,
      })
      .eq("id", job.id);
    return "completed";
  }

  const attemptCount = (job.attempt_count ?? 0) + 1;
  const maxAttempts = job.max_attempts ?? 5;
  const exhausted = attemptCount >= maxAttempts;

  await admin
    .from("inbound_webhook_queue")
    .update({
      status: exhausted ? "failed" : "pending",
      attempt_count: attemptCount,
      last_error: result.error ?? "Processing failed.",
      next_attempt_at: new Date(
        Date.now() + BASE_RETRY_SECONDS * 1000 * 2 ** (attemptCount - 1),
      ).toISOString(),
    })
    .eq("id", job.id);

  if (!exhausted) {
    dispatchInboundWebhookWorker();
  }

  return exhausted ? "failed" : "retried";
}

export async function processPendingInboundWebhooks(): Promise<{
  processed: number;
  completed: number;
  retried: number;
  failed: number;
}> {
  const claimed = await claimInboundWebhookJobs(BATCH_SIZE);

  if (claimed.length === 0) {
    return { processed: 0, completed: 0, retried: 0, failed: 0 };
  }

  const outcomes = await runWithConcurrency(
    claimed,
    getWorkerConcurrency(),
    (job) =>
      processClaimedWebhookJob({
        id: job.id,
        channel: job.channel,
        payload: job.payload,
        metadata: (job.metadata as Record<string, unknown> | null) ?? null,
        attempt_count: job.attempt_count,
        max_attempts: job.max_attempts,
      }),
  );

  return {
    processed: claimed.length,
    completed: outcomes.filter((outcome) => outcome === "completed").length,
    retried: outcomes.filter((outcome) => outcome === "retried").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
  };
}
