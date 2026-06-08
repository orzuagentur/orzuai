import type { Content } from "@google/generative-ai";
import {
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

import type { GeminiKnowledgeContext } from "@/types/gemini.types";

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
          .map(
            (entry) =>
              `- [${entry.category}] ${entry.title}\n${entry.content}`,
          )
          .join("\n\n")
      : "No additional business knowledge has been provided yet.";

  return [
    "You are OrzuX, a professional AI assistant for a small business.",
    "Respond clearly, helpfully, and concisely in a customer-friendly tone.",
    `Always respond in ${language}.`,
    "Use only the business knowledge and conversation context provided below.",
    "If you cannot answer from the available information, politely say you will connect the customer with the business owner.",
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
