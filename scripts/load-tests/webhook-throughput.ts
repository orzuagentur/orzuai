/**
 * CAT-P3-08 — enqueue synthetic inbound webhooks at target throughput.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/load-tests/webhook-throughput.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
 *   LOAD_TEST_WEBHOOK_COUNT (default 1000)
 *   LOAD_TEST_WEBHOOK_DURATION_SEC (default 60) — spread inserts over window
 *   LOAD_TEST_WEBHOOK_CHANNEL (default whatsapp)
 */

import { createHash } from "crypto";

import {
  createAdminClient,
  printStats,
  summarizeLatencies,
  type LoadTestStats,
} from "./shared";

const DEFAULT_COUNT = 1000;
const DEFAULT_DURATION_SEC = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const count = Number(process.env.LOAD_TEST_WEBHOOK_COUNT ?? DEFAULT_COUNT);
  const durationSec = Number(
    process.env.LOAD_TEST_WEBHOOK_DURATION_SEC ?? DEFAULT_DURATION_SEC,
  );
  const channel = (process.env.LOAD_TEST_WEBHOOK_CHANNEL ?? "whatsapp").trim();

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("LOAD_TEST_WEBHOOK_COUNT must be a positive number");
  }

  const admin = createAdminClient();
  const intervalMs =
    durationSec > 0 ? Math.max(1, Math.floor((durationSec * 1000) / count)) : 0;

  const latenciesMs: number[] = [];
  let failed = 0;
  const startedAt = Date.now();

  console.log(
    `Enqueueing ${count} ${channel} webhooks over ~${durationSec}s (${intervalMs}ms interval)`,
  );

  for (let index = 0; index < count; index += 1) {
    const payload = {
      loadTest: true,
      index,
      sentAt: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(payload);
    const idempotencyKey = `${channel}:loadtest:${createHash("sha256").update(rawBody).digest("hex")}`;

    const opStarted = Date.now();

    const { error } = await admin.from("inbound_webhook_queue").insert({
      channel,
      idempotency_key: idempotencyKey,
      payload,
      metadata: { source: "load-test", index },
      status: "pending",
    });

    const latency = Date.now() - opStarted;

    if (error) {
      failed += 1;
      if (failed <= 5) {
        console.error(`insert failed [${index}]:`, error.message);
      }
    } else {
      latenciesMs.push(latency);
    }

    if (intervalMs > 0 && index < count - 1) {
      await sleep(intervalMs);
    }
  }

  const durationMs = Date.now() - startedAt;
  const stats: LoadTestStats = {
    ...summarizeLatencies(latenciesMs, durationMs),
    total: count,
    failed,
    succeeded: latenciesMs.length,
    throughputPerMin:
      durationMs > 0
        ? Math.round((latenciesMs.length / durationMs) * 60_000)
        : 0,
  };

  printStats("webhook enqueue", stats);

  if (failed > 0) {
    console.log(`  failed:    ${failed}`);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
