import type { GeminiKnowledgeContext } from "@/types/gemini.types";

const CRITICAL_VOICE_WORKER_POLICY = [
  "- You are an autonomous front-line worker, not a receptionist who escalates by default.",
  "- Handle booking, pricing, and support yourself using the provided business knowledge.",
  "- Answer prices and services from knowledge only; never invent them.",
  "- Never say a manager, staff member, owner, or human will check, confirm, call back, or contact the caller unless the caller explicitly confirmed they want a human.",
  "- If booking details are missing, ask one short spoken question. If booking is already done, confirm it clearly. Never say wait for a callback.",
].join("\n");

export function buildVoiceSystemPrompt(input: {
  businessName: string;
  systemPrompt: string;
  language: string;
  knowledgeContext: GeminiKnowledgeContext[];
  customVoicePrompt?: string | null;
  voiceRules?: string | null;
  callObjective?: string | null;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
  realtime?: boolean;
  conversationSummary?: string | null;
  crmContext?: string | null;
}): string {
  const knowledgeSection =
    input.knowledgeContext.length > 0
      ? input.knowledgeContext
          .map((entry) => {
            const citation = entry.citation?.trim() || entry.title;
            const category = entry.category?.trim() || "General";
            return `- [${citation}] (${category}) ${entry.title}: ${entry.content}`;
          })
          .join("\n")
      : "No extra business knowledge provided yet.";

  const callContext =
    input.direction === "outbound" && input.triggerReason === "order_callback"
      ? "You are calling a customer who just submitted a request on the business website. Confirm their request warmly and answer questions."
      : input.direction === "outbound"
        ? "You are making an outbound business call. Be polite and concise."
        : "A customer called the business phone line. Help them as the business AI Agent.";

  const custom = input.customVoicePrompt?.trim();
  const objective = input.callObjective?.trim();
  const voiceRules =
    input.voiceRules?.trim() ||
    "- Speak naturally in short sentences (1-3 sentences per reply).";
  const conversationSummary = input.conversationSummary?.trim();
  const crmContext = input.crmContext?.trim();

  return [
    `You are the AI voice assistant for ${input.businessName}.`,
    callContext,
    "Rules for phone conversation:",
    CRITICAL_VOICE_WORKER_POLICY,
    voiceRules,
    `- Always respond in ${input.language}.`,
    custom ? `\nVoice instructions:\n${custom}` : "",
    objective
      ? `\nCall objective for this conversation:\n${objective}\nTurn this into a professional, helpful phone conversation.`
      : "",
    conversationSummary
      ? `\nPrior conversation summary (from chat/CRM history):\n${conversationSummary}`
      : "",
    crmContext
      ? `\nCustomer CRM snapshot (use only when relevant):\n${crmContext}`
      : "",
    "\nBusiness instructions:",
    input.systemPrompt,
    "\nBusiness knowledge:",
    knowledgeSection,
  ]
    .filter(Boolean)
    .join("\n");
}
