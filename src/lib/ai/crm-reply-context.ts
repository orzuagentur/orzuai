import { AI_CONTEXT_LIMITS } from "@/lib/ai/context-window";

export type CrmReplyOpenDeal = {
  id: string;
  title: string;
  value: number | null;
  stage: string | null;
};

export type CrmReplyContactSnapshot = {
  name: string;
  email?: string | null;
  phone?: string | null;
  pipelineStage: string | null;
  dealValue: number | null;
  leadScore: number | null;
  expectedCloseDate: string | null;
  aiSummary: string | null;
  openTaskCount: number;
  openDeals?: CrmReplyOpenDeal[];
  customFields?: Record<string, unknown> | null;
};

export function buildCrmReplyContext(
  snapshot: CrmReplyContactSnapshot | null,
): string {
  if (!snapshot) {
    return "";
  }

  const openDeals = snapshot.openDeals ?? [];
  const openDealsLine =
    openDeals.length > 0
      ? `Open deals: ${openDeals
          .map((deal) => {
            const parts = [
              deal.title || "Untitled",
              deal.value != null ? `value ${deal.value}` : null,
              deal.stage ? `stage ${deal.stage}` : null,
              `id ${deal.id}`,
            ].filter(Boolean);
            return parts.join(" · ");
          })
          .join("; ")}`
      : "Open deals: none — create_deal only if this is a new sale";

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
    openDealsLine,
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
    "If Open deals are listed, prefer update_deal (with deal id when present) instead of create_deal.",
  ].join("\n");
}
