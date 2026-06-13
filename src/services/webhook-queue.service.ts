import "server-only";

import { createHash } from "crypto";

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
      scheduleInboundWebhookProcessing();
      return { queued: false, duplicate: true };
    }

    throw error;
  }

  scheduleInboundWebhookProcessing();
  return { queued: true, duplicate: false };
}

let webhookDrainPromise: Promise<void> | null = null;

async function drainInboundWebhookQueue(): Promise<void> {
  let batch = await processPendingInboundWebhooks();

  while (batch.processed === BATCH_SIZE) {
    batch = await processPendingInboundWebhooks();
  }
}

export function scheduleInboundWebhookProcessing(): void {
  if (webhookDrainPromise) {
    return;
  }

  webhookDrainPromise = drainInboundWebhookQueue()
    .catch((error) => {
      console.error("[webhook-queue] immediate processing failed", error);
    })
    .finally(() => {
      webhookDrainPromise = null;
    });
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

export async function processPendingInboundWebhooks(): Promise<{
  processed: number;
  completed: number;
  retried: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await admin
    .from("inbound_webhook_queue")
    .select("id, channel, payload, metadata, attempt_count, max_attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!pending?.length) {
    return { processed: 0, completed: 0, retried: 0, failed: 0 };
  }

  let completed = 0;
  let retried = 0;
  let failed = 0;

  for (const job of pending) {
    await admin
      .from("inbound_webhook_queue")
      .update({ status: "processing" })
      .eq("id", job.id);

    const result = await processWebhookJob({
      id: job.id,
      channel: job.channel,
      payload: job.payload,
      metadata: (job.metadata as Record<string, unknown> | null) ?? null,
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
      completed += 1;
      continue;
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

    if (exhausted) {
      failed += 1;
    } else {
      retried += 1;
    }
  }

  return {
    processed: pending.length,
    completed,
    retried,
    failed,
  };
}
