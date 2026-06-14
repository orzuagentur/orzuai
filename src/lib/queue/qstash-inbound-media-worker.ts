import "server-only";

import { Client, Receiver } from "@upstash/qstash";

import { ENV_KEYS } from "@/constants/env-keys";
import { getAppUrl } from "@/lib/env";

const WORKER_PATH = "/api/workers/inbound-media-hydration";

export function isQStashInboundMediaWorkerConfigured(): boolean {
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

export async function dispatchInboundMediaHydrationWorker(input?: {
  messageId?: string;
  delaySeconds?: number;
}): Promise<{ dispatched: boolean }> {
  const qstash = getQStashClient();
  if (!qstash || !isQStashInboundMediaWorkerConfigured()) {
    return { dispatched: false };
  }

  const url = `${getAppUrl().replace(/\/$/, "")}${WORKER_PATH}`;
  const deduplicationId = input?.messageId
    ? `media-hydration-${input.messageId}`
    : `media-hydration-drain-${Math.floor(Date.now() / 500)}`;

  try {
    await qstash.publishJSON({
      url,
      body: {
        messageId: input?.messageId ?? null,
        enqueuedAt: Date.now(),
      },
      deduplicationId,
      delay: input?.delaySeconds,
      retries: 3,
    });
    return { dispatched: true };
  } catch (error) {
    console.error("[inbound-media] QStash dispatch failed", error);
    return { dispatched: false };
  }
}

export async function verifyQStashInboundMediaRequest(
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
