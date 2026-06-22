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
    "",
    "Business instructions:",
    instructions,
  ].join("\n");
}
