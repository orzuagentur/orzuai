import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AutomationActivityItem, AutomationStats } from "@/types/automations.types";

export async function getAutomationStats(
  businessId: string,
): Promise<AutomationStats> {
  if (!hasSupabaseEnv()) {
    return {
      followUpsSent: 0,
      qualifiedContacts: 0,
      crmTasksCreated: 0,
      activeRules: 0,
    };
  }

  const admin = createAdminClient();
  const [followUps, qualified, tasks] = await Promise.all([
    admin
      .from("conversation_follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    admin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("pipeline_stage", "qualified"),
    admin
      .from("crm_tasks")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .ilike("title", "Follow up: high-intent%"),
  ]);

  return {
    followUpsSent: followUps.count ?? 0,
    qualifiedContacts: qualified.count ?? 0,
    crmTasksCreated: tasks.count ?? 0,
    activeRules: 0,
  };
}

export async function getAutomationActivity(
  businessId: string,
  limit = 30,
): Promise<AutomationActivityItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const perSource = Math.ceil(limit / 4);

  const [followUps, tasks, qualifiedContacts, workflowRuns] = await Promise.all([
    admin
      .from("conversation_follow_ups")
      .select(
        "id, sent_at, follow_up_day, conversations!inner(channel, contacts!inner(name))",
      )
      .eq("business_id", businessId)
      .order("sent_at", { ascending: false })
      .limit(perSource),
    admin
      .from("crm_tasks")
      .select("id, title, created_at, contacts!inner(name)")
      .eq("business_id", businessId)
      .ilike("title", "Follow up: high-intent%")
      .order("created_at", { ascending: false })
      .limit(perSource),
    admin
      .from("contacts")
      .select("id, name, lead_score, created_at")
      .eq("business_id", businessId)
      .eq("pipeline_stage", "qualified")
      .order("created_at", { ascending: false })
      .limit(perSource),
    admin
      .from("automation_runs")
      .select("id, trigger_type, action_type, status, detail, created_at, automations!inner(name)")
      .eq("business_id", businessId)
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(perSource),
  ]);

  const items: AutomationActivityItem[] = [];

  for (const row of followUps.data ?? []) {
    const conversation = row.conversations as {
      channel: string;
      contacts: { name: string | null };
    } | null;
    const contactName = conversation?.contacts?.name?.trim() || "Customer";

    items.push({
      id: `follow_up:${row.id}`,
      type: "follow_up_sent",
      title: `Follow-up sent to ${contactName}`,
      detail: `Day ${row.follow_up_day} · ${conversation?.channel ?? "channel"}`,
      occurredAt: row.sent_at,
    });
  }

  for (const row of tasks.data ?? []) {
    const contact = row.contacts as { name: string | null } | null;
    const contactName = contact?.name?.trim() || "Customer";

    items.push({
      id: `crm_task:${row.id}`,
      type: "crm_task_created",
      title: `CRM task for ${contactName}`,
      detail: row.title,
      occurredAt: row.created_at,
    });
  }

  for (const row of qualifiedContacts.data ?? []) {
    items.push({
      id: `qualified:${row.id}`,
      type: "contact_qualified",
      title: `${row.name?.trim() || "Contact"} moved to Qualified`,
      detail: row.lead_score != null ? `Lead score ${row.lead_score}` : undefined,
      occurredAt: row.created_at,
    });
  }

  for (const row of workflowRuns.data ?? []) {
    const automation = row.automations as { name: string } | null;

    items.push({
      id: `workflow_run:${row.id}`,
      type: "workflow_run",
      title: automation?.name ?? "Custom workflow",
      detail: `${row.trigger_type} → ${row.action_type}${row.detail ? ` · ${row.detail}` : ""}`,
      occurredAt: row.created_at,
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);
}
