import type { Content } from "@google/generative-ai";
import {
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

import type { GeminiKnowledgeContext } from "@/types/gemini.types";
import { MULTILINGUAL_LANGUAGE_VALUE } from "@/lib/ai/languages";

export function buildLanguageInstruction(language: string): string {
  const normalized = language.trim();

  if (normalized === MULTILINGUAL_LANGUAGE_VALUE) {
    return "Detect the customer's language from their messages and always reply in that same language. If the language is unclear, use English.";
  }

  return `Always respond in ${normalized}.`;
}

export function buildAssistantSystemInstruction({
  systemPrompt,
  language,
  knowledgeContext = [],
}: {
  systemPrompt: string;
  language: string;
  knowledgeContext?: GeminiKnowledgeContext[];
}): string {
  const knowledgeSection =
    knowledgeContext.length > 0
      ? knowledgeContext
          .map((entry) => {
            const citation = entry.citation?.trim() || entry.title;
            const category = entry.category?.trim() || "General";
            return `- [${citation}] (${category}) ${entry.title}\n${entry.content}`;
          })
          .join("\n\n")
      : "No additional business knowledge has been provided yet.";

  return [
    "You are OrzuX, a professional AI assistant for a small business.",
    "Respond clearly, helpfully, and concisely in a customer-friendly tone.",
    buildLanguageInstruction(language),
    "Use only the business knowledge and conversation context provided below.",
    "When stating prices, services, or policies, ground them in the cited knowledge entries (labels like KB-…). Do not invent facts.",
    "If details are missing, ask one short clarifying question and keep helping in the chat.",
    "Do not promise that an owner, manager, staff member, or human will contact the customer unless the customer explicitly confirmed they want a human.",
    "Never invent prices, policies, or services that are not supported by the provided knowledge.",
    "",
    "Business instructions:",
    systemPrompt,
    "",
    "Business knowledge:",
    knowledgeSection,
  ].join("\n");
}

export function mapConversationHistoryToGeminiContents(
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Content[] {
  return history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export const GEMINI_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
] as const;
