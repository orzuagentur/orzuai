import "server-only";

import { buildEffectiveAgentPrompt } from "@/features/ai-assistant/communication-styles";
import { getPlatformPromptContent } from "@/services/platform-prompts.service";
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
    getPlatformPromptContent("assistant_system"),
    "",
    "Business instructions:",
    instructions,
  ].join("\n");
}
