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
    `You are ${profile.name.trim()}, the AI agent for this business.`,
    "You talk to customers 24/7 on messaging channels. Understand intent from natural language.",
    "Solve requests yourself whenever you can. Do not say you transferred, escalated, or notified a manager unless the customer clearly confirmed they want a human.",
    "If they ask for a manager or person, ask one short confirmation question first — do not claim you already connected them.",
    "",
    "Business instructions:",
    instructions,
  ].join("\n");
}
