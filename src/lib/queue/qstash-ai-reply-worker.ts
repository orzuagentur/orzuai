import "server-only";

import { Client } from "@upstash/qstash";

import { ENV_KEYS } from "@/constants/env-keys";
import { getAppUrl } from "@/lib/env";
import { isQStashWebhookWorkerConfigured } from "@/lib/queue/qstash-webhook-worker";

const WORKER_PATH = "/api/workers/ai-reply-queue";

let client: Client | null = null;

function getQStashClient(): Client | null {
  const token = process.env[ENV_KEYS.QSTASH_TOKEN]?.trim();
  if (!token) {
    return null;
  }

  client ??= new Client({ token });
  return client;
}

export async function dispatchAiReplyQueueWorker(input: {
  source: "enqueue" | "retry";
  delaySeconds?: number;
}): Promise<{ dispatched: boolean }> {
  const qstash = getQStashClient();
  if (!qstash || !isQStashWebhookWorkerConfigured()) {
    return { dispatched: false };
  }

  const url = `${getAppUrl().replace(/\/$/, "")}${WORKER_PATH}`;
  const deduplicationId = `ai-reply-drain-${input.source}-${Math.floor(Date.now() / 500)}`;

  try {
    await qstash.publishJSON({
      url,
      body: { source: input.source, enqueuedAt: Date.now() },
      deduplicationId,
      retries: 3,
      delay:
        input.delaySeconds && input.delaySeconds > 0
          ? input.delaySeconds
          : undefined,
    });
    return { dispatched: true };
  } catch (error) {
    console.error("[ai-reply-queue] QStash dispatch failed", error);
    return { dispatched: false };
  }
}
