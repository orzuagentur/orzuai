import type { GeminiKnowledgeContext } from "@/types/gemini.types";

export function buildVoiceSystemPrompt(input: {
  businessName: string;
  systemPrompt: string;
  language: string;
  knowledgeContext: GeminiKnowledgeContext[];
  customVoicePrompt?: string | null;
  callObjective?: string | null;
  direction: "inbound" | "outbound";
  triggerReason?: string | null;
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
        : "A customer called the business phone line. Help them as a phone receptionist.";

  const custom = input.customVoicePrompt?.trim();
  const objective = input.callObjective?.trim();

  return [
    `You are the AI voice assistant for ${input.businessName}.`,
    callContext,
    "Rules for phone conversation:",
    "- Speak naturally in short sentences (1-3 sentences per reply).",
    "- No markdown, lists, emojis, or URLs.",
    `- Always respond in ${input.language}.`,
    "- Use only the business knowledge below.",
    "- If you cannot help, offer to have a human follow up.",
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
