import { AI_CONTEXT_LIMITS } from "@/lib/ai/context-window";

export type CrmReplyContactSnapshot = {
  name: string;
  pipelineStage: string | null;
  dealValue: number | null;
  leadScore: number | null;
  expectedCloseDate: string | null;
  aiSummary: string | null;
  openTaskCount: number;
};

export function buildCrmReplyContext(
  snapshot: CrmReplyContactSnapshot | null,
): string {
  if (!snapshot) {
    return "";
  }

  const lines = [
    `Contact: ${snapshot.name}`,
    snapshot.pipelineStage ? `Pipeline stage: ${snapshot.pipelineStage}` : null,
    snapshot.dealValue != null ? `Deal value: ${snapshot.dealValue}` : null,
    snapshot.leadScore != null ? `Lead score: ${snapshot.leadScore}` : null,
    snapshot.expectedCloseDate
      ? `Expected close: ${snapshot.expectedCloseDate}`
      : null,
    snapshot.openTaskCount > 0
      ? `Open tasks: ${snapshot.openTaskCount}`
      : null,
    snapshot.aiSummary?.trim()
      ? `CRM notes: ${snapshot.aiSummary.trim()}`
      : null,
  ].filter(Boolean);

  if (lines.length <= 1) {
    return "";
  }

  const body = lines.join("\n");
  const max = AI_CONTEXT_LIMITS.maxCrmContextChars;

  if (body.length <= max) {
    return body;
  }

  return `${body.slice(0, max - 3)}...`;
}

export function formatCrmContextForSystemPrompt(context: string): string {
  if (!context.trim()) {
    return "";
  }

  return [
    "Customer CRM snapshot (use only when relevant to the question):",
    context.trim(),
  ].join("\n");
}
