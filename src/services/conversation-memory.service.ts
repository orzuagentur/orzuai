import "server-only";

import { AI_CONTEXT_LIMITS } from "@/lib/ai/context-window";
import { generateTextWithFallback } from "@/services/llm.service";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getMessageRepository } from "@/repositories/message.repository";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessagingDbClient = SupabaseClient<Database>;

export type ConversationMemorySnapshot = {
  aiSummary: string | null;
  aiSummaryUpdatedAt: string | null;
  aiSummaryMessageCount: number;
  totalMessageCount: number;
};

const SUMMARY_SYSTEM_INSTRUCTION = [
  "You summarize customer support conversations for an AI assistant.",
  "Capture customer intent, key facts, open questions, commitments, and next steps.",
  "Write in the same language as the conversation.",
  "Keep the summary under 400 words.",
  "Do not include greetings or filler.",
].join(" ");

export async function loadConversationMemory(
  admin: MessagingDbClient,
  conversationId: string,
): Promise<ConversationMemorySnapshot | null> {
  return getConversationRepository(admin).loadMemory(conversationId);
}

function shouldRefreshConversationSummary(
  memory: ConversationMemorySnapshot,
): boolean {
  const interval = AI_CONTEXT_LIMITS.summaryRefreshEveryMessages;
  const total = memory.totalMessageCount;

  if (total < interval) {
    return false;
  }

  if (!memory.aiSummary) {
    return true;
  }

  return total - memory.aiSummaryMessageCount >= interval;
}

async function fetchRecentMessagesForSummary(
  admin: MessagingDbClient,
  conversationId: string,
  limit = 30,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await getMessageRepository(admin).listMessagesForSummary(
    conversationId,
    limit,
  );

  return [...messages]
    .reverse()
    .map((message) => ({
      role:
        message.sender_type === "client"
          ? ("user" as const)
          : ("assistant" as const),
      content: message.content,
    }));
}

function buildSummaryPrompt(input: {
  previousSummary: string | null;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): string {
  const transcript = input.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  if (input.previousSummary?.trim()) {
    return [
      "Update the rolling conversation summary using the previous summary and new messages.",
      "",
      "Previous summary:",
      input.previousSummary.trim(),
      "",
      "Recent messages:",
      transcript,
    ].join("\n");
  }

  return [
    "Create a rolling conversation summary from these messages:",
    "",
    transcript,
  ].join("\n");
}

export async function refreshConversationSummaryIfNeeded(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
}): Promise<string | null> {
  const conversationRepo = getConversationRepository(input.admin);
  const memory = await conversationRepo.loadMemory(input.conversationId);

  if (!memory || !shouldRefreshConversationSummary(memory)) {
    return memory?.aiSummary ?? null;
  }

  const messages = await fetchRecentMessagesForSummary(
    input.admin,
    input.conversationId,
  );

  if (messages.length === 0) {
    return memory.aiSummary;
  }

  const result = await generateTextWithFallback({
    businessId: input.businessId,
    conversationId: input.conversationId,
    callType: "conversation_summary",
    preferredProvider: "gemini",
    systemInstruction: SUMMARY_SYSTEM_INSTRUCTION,
    prompt: buildSummaryPrompt({
      previousSummary: memory.aiSummary,
      messages,
    }),
  });

  if (!result.success) {
    return memory.aiSummary;
  }

  const summary = result.data.text.trim().slice(0, AI_CONTEXT_LIMITS.maxSummaryChars);
  const now = new Date().toISOString();

  await conversationRepo.updateMemorySummary(input.conversationId, {
    aiSummary: summary,
    aiSummaryUpdatedAt: now,
    aiSummaryMessageCount: memory.totalMessageCount,
  });

  return summary;
}

export function formatConversationSummaryForSystemPrompt(
  summary: string | null | undefined,
): string {
  if (!summary?.trim()) {
    return "";
  }

  return [
    "Conversation summary (older messages not shown below):",
    summary.trim(),
  ].join("\n");
}
