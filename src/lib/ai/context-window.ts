import {
  GEMINI_MAX_HISTORY_MESSAGES,
  GEMINI_MAX_KNOWLEDGE_ENTRIES,
} from "@/lib/gemini/constants";
import { estimateTokensFromText } from "@/lib/ai/cost";

export const PRO_HISTORY_MESSAGE_LIMIT = 40;

export const AI_CONTEXT_LIMITS = {
  defaultHistoryMessages: GEMINI_MAX_HISTORY_MESSAGES,
  proHistoryMessages: PRO_HISTORY_MESSAGE_LIMIT,
  maxCrmContextChars: 800,
  maxSummaryChars: 2000,
  maxKnowledgeEntries: GEMINI_MAX_KNOWLEDGE_ENTRIES,
  summaryRefreshEveryMessages: 10,
  /** Rough token ceiling for auto-reply prompt assembly. */
  maxPromptTokens: 12_000,
} as const;

const EXTENDED_CONTEXT_PLANS = new Set(["pro", "agency", "enterprise", "business"]);

export function resolveHistoryMessageLimit(subscriptionPlan?: string | null): number {
  const normalized = subscriptionPlan?.trim().toLowerCase() ?? "";

  if (EXTENDED_CONTEXT_PLANS.has(normalized)) {
    return AI_CONTEXT_LIMITS.proHistoryMessages;
  }

  return AI_CONTEXT_LIMITS.defaultHistoryMessages;
}

export function trimConversationHistory<T extends { role: string; content: string }>(
  history: T[],
  limit: number,
): T[] {
  if (history.length <= limit) {
    return history;
  }

  return history.slice(history.length - limit);
}

export function trimKnowledgeEntriesByTokenBudget<T extends { title: string; content: string }>(
  entries: T[],
  maxEntries: number,
  maxTokens: number,
): T[] {
  const capped = entries.slice(0, maxEntries);
  const selected: T[] = [];
  let usedTokens = 0;

  for (const entry of capped) {
    const entryTokens = estimateTokensFromText(`${entry.title}\n${entry.content}`);

    if (selected.length > 0 && usedTokens + entryTokens > maxTokens) {
      break;
    }

    selected.push(entry);
    usedTokens += entryTokens;
  }

  return selected;
}

export function estimateAutoReplyPromptTokens(input: {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: Array<{ content: string }>;
  knowledgeEntries: Array<{ title: string; content: string }>;
  conversationSummary?: string | null;
  crmContext?: string | null;
}): number {
  const knowledgeText = input.knowledgeEntries
    .map((entry) => `${entry.title}\n${entry.content}`)
    .join("\n");

  const historyText = input.conversationHistory.map((message) => message.content).join("\n");

  return estimateTokensFromText(
    [
      input.systemPrompt,
      input.conversationSummary ?? "",
      input.crmContext ?? "",
      knowledgeText,
      historyText,
      input.userMessage,
    ].join("\n"),
  );
}

export function fitsAutoReplyTokenBudget(input: {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: Array<{ content: string }>;
  knowledgeEntries: Array<{ title: string; content: string }>;
  conversationSummary?: string | null;
  crmContext?: string | null;
}): boolean {
  return (
    estimateAutoReplyPromptTokens(input) <= AI_CONTEXT_LIMITS.maxPromptTokens
  );
}
