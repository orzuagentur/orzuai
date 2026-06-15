/**
 * CAT-P3-09 — simulate concurrent inbox list RPC sessions.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/load-tests/inbox-concurrent-sessions.ts
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (required)
 *   LOAD_TEST_EMAIL, LOAD_TEST_PASSWORD (required)
 *   LOAD_TEST_BUSINESS_ID (required)
 *   LOAD_TEST_INBOX_SESSIONS (default 100)
 *   LOAD_TEST_INBOX_ROUNDS (default 3) — list fetches per session
 */

import {
  createAuthenticatedClient,
  printStats,
  requireEnv,
  runConcurrent,
  summarizeLatencies,
  type LoadTestStats,
} from "./shared";

const DEFAULT_SESSIONS = 100;
const DEFAULT_ROUNDS = 3;

async function main(): Promise<void> {
  const sessions = Number(
    process.env.LOAD_TEST_INBOX_SESSIONS ?? DEFAULT_SESSIONS,
  );
  const rounds = Number(process.env.LOAD_TEST_INBOX_ROUNDS ?? DEFAULT_ROUNDS);
  const businessId = requireEnv("LOAD_TEST_BUSINESS_ID");

  if (!Number.isFinite(sessions) || sessions <= 0) {
    throw new Error("LOAD_TEST_INBOX_SESSIONS must be a positive number");
  }

  const { client, userId } = await createAuthenticatedClient();
  const latenciesMs: number[] = [];
  let failed = 0;
  const startedAt = Date.now();

  console.log(
    `Running ${sessions} concurrent inbox sessions × ${rounds} list_inbox_conversations calls`,
  );

  await runConcurrent(sessions, sessions, async (sessionIndex) => {
    for (let round = 0; round < rounds; round += 1) {
      const opStarted = Date.now();

      const { error } = await client.rpc("list_inbox_conversations", {
        p_business_id: businessId,
        p_user_id: userId,
        p_limit: 50,
        p_offset: round * 50,
        p_include_total_count: round === 0,
      });

      const latency = Date.now() - opStarted;

      if (error) {
        failed += 1;
        if (failed <= 5) {
          console.error(
            `rpc failed [session=${sessionIndex} round=${round}]:`,
            error.message,
          );
        }
        continue;
      }

      latenciesMs.push(latency);
    }
  });

  const durationMs = Date.now() - startedAt;
  const totalOps = sessions * rounds;
  const stats: LoadTestStats = {
    ...summarizeLatencies(latenciesMs, durationMs),
    total: totalOps,
    failed,
    succeeded: latenciesMs.length,
    throughputPerMin:
      durationMs > 0
        ? Math.round((latenciesMs.length / durationMs) * 60_000)
        : 0,
  };

  printStats("inbox list rpc", stats);

  if (failed > 0) {
    console.log(`  failed:    ${failed}`);
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
