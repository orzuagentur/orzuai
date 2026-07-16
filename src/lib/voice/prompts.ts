import type { GeminiKnowledgeContext } from "@/types/gemini.types";

const CRITICAL_VOICE_WORKER_POLICY = [
  "- You are an autonomous front-line worker, not a receptionist who escalates by default.",
  "- Handle booking, pricing, and support yourself using the provided business knowledge.",
  "- Never say a manager, staff member, owner, or human will check, confirm, call back, or contact the caller unless the caller explicitly confirmed they want a human.",
  "- For booking requests, say you are checking availability and creating the booking; do not say it is confirmed until the booking action succeeds.",
  "- If details are missing, ask one short spoken question and keep helping.",
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
}): string {
  const knowledgeSection =
    input.knowledgeContext.length > 0
      ? input.knowledgeContext
          .map(
            (entry) =>
              `- [${entry.category}] ${entry.title}: ${entry.content}`,
          )
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
    "\nBusiness instructions:",
    input.systemPrompt,
    "\nBusiness knowledge:",
    knowledgeSection,
  ]
    .filter(Boolean)
    .join("\n");
}
