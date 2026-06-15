import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type LoadTestStats = {
  total: number;
  succeeded: number;
  failed: number;
  durationMs: number;
  p50Ms: number;
  p95Ms: number;
  throughputPerMin: number;
};

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }

  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function createAuthenticatedClient(): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  const client = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const email = requireEnv("LOAD_TEST_EMAIL");
  const password = requireEnv("LOAD_TEST_PASSWORD");

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(
      `Auth failed for ${email}: ${error?.message ?? "no user returned"}`,
    );
  }

  return { client, userId: data.user.id };
}

export function percentile(sortedMs: number[], p: number): number {
  if (sortedMs.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedMs.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedMs.length) - 1),
  );

  return sortedMs[index]!;
}

export function summarizeLatencies(
  latenciesMs: number[],
  durationMs: number,
): LoadTestStats {
  const sorted = [...latenciesMs].sort((left, right) => left - right);
  const succeeded = sorted.length;
  const total = succeeded;
  const throughputPerMin =
    durationMs > 0 ? Math.round((succeeded / durationMs) * 60_000) : 0;

  return {
    total,
    succeeded,
    failed: 0,
    durationMs,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    throughputPerMin,
  };
}

export async function runConcurrent<T>(
  concurrency: number,
  total: number,
  worker: (index: number) => Promise<T>,
): Promise<T[]> {
  const results: T[] = new Array(total);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;

      if (index >= total) {
        return;
      }

      nextIndex += 1;
      results[index] = await worker(index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => runWorker()),
  );

  return results;
}

export function printStats(label: string, stats: LoadTestStats): void {
  console.log(`\n[${label}]`);
  console.log(`  succeeded: ${stats.succeeded}`);
  console.log(`  duration:  ${stats.durationMs} ms`);
  console.log(`  p50:       ${stats.p50Ms} ms`);
  console.log(`  p95:       ${stats.p95Ms} ms`);
  console.log(`  rate:      ${stats.throughputPerMin}/min`);
}
