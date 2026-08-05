/**
 * Golden-path QA checklist for staging (manual + env validation).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ai-golden-path/checklist.ts
 */

import { createAdminClient, requireEnv } from "../load-tests/shared";

const CHECKLIST = [
  "Inbound WA/TG → reply < 10s, grounded by KB",
  "Booking phrase → calendar event + customer confirmation",
  "Sales intent → deal or manager task + notification",
  "Custom fields → update_collected_fields → deal/order",
  "Handoff confirmed → one human request; AI paused after accept",
  "Webhook retry → single CRM write (idempotency)",
  "Website chat → same auto-reply pipeline",
  "Voice turn → CRM via ai_orchestration_jobs when conversation exists",
  "Orchestrator failure → customer already got reply",
  "AI dashboard → CRM runs, cost, failures visible",
];

async function main(): Promise<void> {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createAdminClient();
  const businessId = process.env.GOLDEN_PATH_BUSINESS_ID?.trim();

  console.log("\nOrzuX AI Golden Path — staging checklist\n");

  for (const [index, item] of CHECKLIST.entries()) {
    console.log(`  ${index + 1}. [ ] ${item}`);
  }

  if (!businessId) {
    console.log(
      "\nSet GOLDEN_PATH_BUSINESS_ID to verify queues for one business.\n",
    );
    return;
  }

  const [replyPending, orchPending, failedRuns] = await Promise.all([
    admin
      .from("ai_reply_jobs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "pending"),
    admin
      .from("ai_orchestration_jobs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "pending"),
    admin
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("success", false)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ),
  ]);

  console.log("\nSnapshot:");
  console.log(`  businessId: ${businessId}`);
  console.log(`  pending ai_reply_jobs: ${replyPending.count ?? 0}`);
  console.log(`  pending ai_orchestration_jobs: ${orchPending.count ?? 0}`);
  console.log(`  failed agent_runs (24h): ${failedRuns.count ?? 0}`);
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
