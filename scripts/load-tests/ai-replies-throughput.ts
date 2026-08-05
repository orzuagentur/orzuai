/**
 * Enqueue synthetic AI reply jobs for throughput / duplicate detection.
 *
 * Usage:
 *   npm run load-test:ai-replies
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   LOAD_TEST_AI_BUSINESS_ID (required)
 *   LOAD_TEST_AI_CONVERSATION_ID (required)
 *   LOAD_TEST_AI_CHANNEL (default whatsapp)
 *   LOAD_TEST_AI_COUNT (default 50)
 *   LOAD_TEST_AI_CONCURRENCY (default 5)
 */

import {
  createAdminClient,
  printStats,
  runConcurrent,
  summarizeLatencies,
} from "./shared";

async function main(): Promise<void> {
  const businessId = process.env.LOAD_TEST_AI_BUSINESS_ID?.trim();
  const conversationId = process.env.LOAD_TEST_AI_CONVERSATION_ID?.trim();
  const channel = (process.env.LOAD_TEST_AI_CHANNEL ?? "whatsapp").trim();
  const count = Number(process.env.LOAD_TEST_AI_COUNT ?? 50);
  const concurrency = Number(process.env.LOAD_TEST_AI_CONCURRENCY ?? 5);

  if (!businessId || !conversationId) {
    throw new Error(
      "LOAD_TEST_AI_BUSINESS_ID and LOAD_TEST_AI_CONVERSATION_ID are required",
    );
  }

  const admin = createAdminClient();
  const started = Date.now();
  const latencies: number[] = [];

  await runConcurrent(concurrency, count, async (index) => {
    const messageStart = Date.now();
    const clientMessage = `load-test ai reply ${Date.now()}-${index}`;

    const { error } = await admin.from("ai_reply_jobs").upsert(
      {
        business_id: businessId,
        conversation_id: conversationId,
        channel,
        client_message: clientMessage,
        pending_messages: [clientMessage],
        status: "pending",
        scheduled_at: new Date().toISOString(),
        needs_reprocess: false,
      },
      { onConflict: "conversation_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    latencies.push(Date.now() - messageStart);
  });

  const stats = summarizeLatencies(latencies, Date.now() - started);
  printStats("ai-replies enqueue", stats);
  console.log(
    "\nNext: hit /api/workers/ai-reply-queue or wait for ai-health cron to drain.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
