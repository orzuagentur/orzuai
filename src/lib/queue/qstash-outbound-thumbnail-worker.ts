import "server-only";

import { Client } from "@upstash/qstash";

import { ENV_KEYS } from "@/constants/env-keys";
import { getAppUrl } from "@/lib/env";
import { isQStashWebhookWorkerConfigured } from "@/lib/queue/qstash-webhook-worker";

const WORKER_PATH = "/api/workers/outbound-thumbnail";
const MAX_THUMBNAIL_ATTEMPTS = 3;

let client: Client | null = null;

function getQStashClient(): Client | null {
  const token = process.env[ENV_KEYS.QSTASH_TOKEN]?.trim();
  if (!token) {
    return null;
  }

  client ??= new Client({ token });
  return client;
}

export function getOutboundThumbnailRetryDelaySeconds(attempt: number): number {
  return 15 * 2 ** Math.max(0, attempt - 1);
}

export async function dispatchOutboundThumbnailWorker(input: {
  messageId: string;
  storagePath: string;
  mimeType: string;
  attempt?: number;
  delaySeconds?: number;
}): Promise<{ dispatched: boolean }> {
  const qstash = getQStashClient();
  if (!qstash || !isQStashWebhookWorkerConfigured()) {
    return { dispatched: false };
  }

  const attempt = input.attempt ?? 1;
  const url = `${getAppUrl().replace(/\/$/, "")}${WORKER_PATH}`;

  try {
    await qstash.publishJSON({
      url,
      body: {
        messageId: input.messageId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        attempt,
        maxAttempts: MAX_THUMBNAIL_ATTEMPTS,
        enqueuedAt: Date.now(),
      },
      deduplicationId: `outbound-thumb-${input.messageId}-${attempt}`,
      retries: 3,
      delay:
        input.delaySeconds && input.delaySeconds > 0
          ? input.delaySeconds
          : undefined,
    });
    return { dispatched: true };
  } catch (error) {
    console.error("[outbound-thumbnail] QStash dispatch failed", error);
    return { dispatched: false };
  }
}
