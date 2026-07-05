import type { AgentToolAuditEntry } from "./types";

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
}
