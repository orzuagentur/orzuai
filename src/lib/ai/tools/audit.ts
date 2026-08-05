import type { AgentToolAuditEntry } from "./types";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export function logAgentToolAudit(entry: AgentToolAuditEntry): void {
  console.info(
    "[agent-tool]",
    JSON.stringify({
      tool: entry.tool,
      businessId: entry.businessId,
      conversationId: entry.conversationId ?? null,
      contactId: entry.contactId ?? null,
      success: entry.success,
      label: entry.label ?? null,
      errorMessage: entry.errorMessage ?? null,
    }),
  );

  if (!hasSupabaseEnv()) {
    return;
  }

  const admin = createAdminClient();

  void admin
    .from("agent_tool_audit_events")
    .insert({
      business_id: entry.businessId,
      conversation_id: entry.conversationId ?? null,
      contact_id: entry.contactId ?? null,
      tool_name: entry.tool,
      success: entry.success,
      label: entry.label ?? null,
      error_message: entry.errorMessage ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[agent-tool] audit persist failed", error.message);
      }
    });
}
