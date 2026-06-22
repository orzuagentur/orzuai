import "server-only";

import { getDefaultGeminiModel } from "@/lib/env";
import { resolveAiModel, type AiProvider } from "@/lib/ai/constants";
import type { MessagingChannel } from "@/types/database.types";
import type { RoutableAiAgent } from "@/utils/ai-agent-routing";

export function selectDefaultChannelAgent(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
}): RoutableAiAgent | null {
  const eligible = input.agents
    .filter((agent) => agent.enabled && agent.channels.includes(input.channel))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  return eligible[0] ?? null;
}

export function resolveAgentLlmConfig(
  agent: RoutableAiAgent | null,
  fallbackProvider: AiProvider = "gemini",
): { provider: AiProvider; model: string } {
  const fallbackModel = getDefaultGeminiModel();

  if (
    agent?.useCustomModel &&
    agent.provider &&
    (agent.provider === "gemini" ||
      agent.provider === "openai" ||
      agent.provider === "claude")
  ) {
    return {
      provider: agent.provider,
      model: resolveAiModel(agent.provider, agent.model),
    };
  }

  return {
    provider: fallbackProvider,
    model: fallbackModel,
  };
}

export function resolveAgentLanguage(
  agent: RoutableAiAgent | null,
  fallbackLanguage: string,
): string {
  return agent?.language?.trim() || fallbackLanguage;
}
