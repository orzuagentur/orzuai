import "server-only";

import { ENV_KEYS } from "@/constants/env-keys";

const DEFAULT_WORKER_CONCURRENCY = 5;
const MAX_WORKER_CONCURRENCY = 25;

export function getWorkerConcurrency(): number {
  const raw = process.env[ENV_KEYS.WORKER_CONCURRENCY]?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : DEFAULT_WORKER_CONCURRENCY;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_WORKER_CONCURRENCY;
  }

  return Math.min(parsed, MAX_WORKER_CONCURRENCY);
}

export async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  handler: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;

      if (index >= items.length) {
        return;
      }

      nextIndex += 1;
      const item = items[index];

      if (item === undefined) {
        return;
      }

      results[index] = await handler(item);
    }
  }

  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
