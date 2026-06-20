import { buildEffectiveAgentPrompt } from "@/features/ai-assistant/communication-styles";
import type { AiAssistantProfileData } from "@/types/ai-assistant-profile.types";

export function buildAssistantSystemPrompt(
  profile: Pick<
    AiAssistantProfileData,
    "name" | "systemPrompt" | "communicationStyle"
  >,
): string {
  const instructions = buildEffectiveAgentPrompt({
    systemPrompt: profile.systemPrompt,
    communicationStyle: profile.communicationStyle,
  });

  return [
    `You are ${profile.name.trim()}, the primary customer-facing AI assistant for this business.`,
    "You support customers 24/7 in chat channels. Answer clearly and helpfully.",
    "Specialized AI agents may handle CRM tasks behind the scenes — you remain the voice customers hear.",
    "",
    "Business instructions:",
    instructions,
  ].join("\n");
}
