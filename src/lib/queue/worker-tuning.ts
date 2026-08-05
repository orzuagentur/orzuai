import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";

const DEFAULT_AI_QUEUE_BATCH_SIZE = 20;
const DEFAULT_AI_QUEUE_MAX_DRAIN_BATCHES = 20;
const MAX_AI_QUEUE_BATCH_SIZE = 100;
const MAX_AI_QUEUE_DRAIN_BATCHES = 100;

function parseBoundedInt(
  raw: string | undefined,
  fallback: number,
  max: number,
): number {
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function getAiQueueBatchSize(): number {
  const unified = process.env.AI_QUEUE_BATCH_SIZE?.trim();
  const replySpecific = process.env.AI_REPLY_QUEUE_BATCH_SIZE?.trim();

  return parseBoundedInt(
    replySpecific ?? unified,
    DEFAULT_AI_QUEUE_BATCH_SIZE,
    MAX_AI_QUEUE_BATCH_SIZE,
  );
}

export function getAiOrchestrationQueueBatchSize(): number {
  const unified = process.env.AI_QUEUE_BATCH_SIZE?.trim();
  const orchSpecific = process.env.AI_ORCHESTRATION_QUEUE_BATCH_SIZE?.trim();

  return parseBoundedInt(
    orchSpecific ?? unified,
    DEFAULT_AI_QUEUE_BATCH_SIZE,
    MAX_AI_QUEUE_BATCH_SIZE,
  );
}

export function getAiQueueMaxDrainBatches(): number {
  const raw = process.env.AI_QUEUE_MAX_DRAIN_BATCHES?.trim();

  return parseBoundedInt(
    raw,
    DEFAULT_AI_QUEUE_MAX_DRAIN_BATCHES,
    MAX_AI_QUEUE_DRAIN_BATCHES,
  );
}

export function getWorkerConcurrencyEnvKey(): string {
  return ENV_KEYS.WORKER_CONCURRENCY;
}
