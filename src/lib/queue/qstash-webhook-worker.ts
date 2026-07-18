import "server-only";

import { Client, Receiver } from "@upstash/qstash";

import { ENV_KEYS } from "@/constants/env-keys";
import { getAppUrl } from "@/lib/env";

const WORKER_PATH = "/api/workers/webhook-queue";

export function isQStashWebhookWorkerConfigured(): boolean {
  return Boolean(
    process.env[ENV_KEYS.QSTASH_TOKEN]?.trim() &&
      process.env[ENV_KEYS.QSTASH_CURRENT_SIGNING_KEY]?.trim(),
  );
}

let client: Client | null = null;

function getQStashClient(): Client | null {
  const token = process.env[ENV_KEYS.QSTASH_TOKEN]?.trim();
  if (!token) {
    return null;
  }

  client ??= new Client({ token });
  return client;
}

let receiver: Receiver | null = null;

function getQStashReceiver(): Receiver | null {
  const currentSigningKey =
    process.env[ENV_KEYS.QSTASH_CURRENT_SIGNING_KEY]?.trim();
  if (!currentSigningKey) {
    return null;
  }

  const nextSigningKey =
    process.env[ENV_KEYS.QSTASH_NEXT_SIGNING_KEY]?.trim() ?? "";

  receiver ??= new Receiver({
    currentSigningKey,
    nextSigningKey,
  });
  return receiver;
}

export async function dispatchWebhookQueueWorker(
  source: "enqueue" | "retry" = "enqueue",
): Promise<{ dispatched: boolean }> {
  const qstash = getQStashClient();
  if (!qstash || !isQStashWebhookWorkerConfigured()) {
    return { dispatched: false };
  }

  const url = `${getAppUrl().replace(/\/$/, "")}${WORKER_PATH}`;
  const deduplicationId = `webhook-drain-${Math.floor(Date.now() / 500)}`;

  try {
    await qstash.publishJSON({
      url,
      body: { source, enqueuedAt: Date.now() },
      deduplicationId,
      retries: 3,
    });
    return { dispatched: true };
  } catch (error) {
    console.error("[webhook-queue] QStash dispatch failed", error);
    const { schedulePlatformErrorReport } = await import(
      "@/services/error-intelligence.service"
    );
    schedulePlatformErrorReport({
      severity: "high",
      module: "messaging",
      category: "webhook",
      source: "qstash-webhook-worker",
      title: "Webhook queue QStash dispatch failed",
      message: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack ?? null : null,
      path: WORKER_PATH,
      method: "POST",
      context: { source },
      rootCause: "Failed to publish inbound webhook drain job to QStash.",
      suggestedFix: "Verify QSTASH_TOKEN and worker URL reachability.",
    });
    return { dispatched: false };
  }
}

export async function verifyQStashWebhookRequest(
  signature: string | null,
  body: string,
): Promise<boolean> {
  const qstashReceiver = getQStashReceiver();
  if (!qstashReceiver || !signature) {
    return false;
  }

  try {
    return await qstashReceiver.verify({
      signature,
      body,
    });
  } catch {
    return false;
  }
}
