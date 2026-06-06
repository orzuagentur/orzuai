import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSalesAgentSettings } from "@/services/sales-agent.service";

type MessagingDbClient = ReturnType<typeof createAdminClient>;

const HIGH_INTENT_KEYWORDS = [
  "buy",
  "price",
  "cost",
  "demo",
  "urgent",
  "asap",
  "contract",
  "order",
  "quote",
  "budget",
  "купить",
  "цена",
  "срочно",
  "sotib",
  "narx",
];

function keywordIntentScore(message: string): number {
  const lower = message.toLowerCase();
  const hits = HIGH_INTENT_KEYWORDS.filter((keyword) =>
    lower.includes(keyword),
  ).length;

  return Math.min(100, hits * 25);
}

export async function processHighIntentTaskRule(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  message: string;
}): Promise<void> {
  const settings = await getSalesAgentSettings(input.businessId);

  if (!settings.autoTaskEnabled || !hasSupabaseEnv()) {
    return;
  }

  const { data: contact } = await input.admin
    .from("contacts")
    .select("lead_score")
    .eq("id", input.contactId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  const leadScore = contact?.lead_score ?? 0;
  const intentScore = Math.max(keywordIntentScore(input.message), leadScore);

  if (intentScore < settings.autoTaskThreshold) {
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentTasks } = await input.admin
    .from("crm_tasks")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("contact_id", input.contactId)
    .ilike("title", "Follow up: high-intent%")
    .gte("created_at", since)
    .limit(1);

  if (recentTasks?.length) {
    return;
  }

  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await input.admin.from("crm_tasks").insert({
    business_id: input.businessId,
    contact_id: input.contactId,
    title: "Follow up: high-intent lead",
    due_at: dueAt,
    status: "open",
  });
}
