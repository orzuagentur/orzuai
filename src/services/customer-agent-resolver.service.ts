import "server-only";

import { getDefaultGeminiModel } from "@/lib/env";
import { resolveAiModel, type AiProvider } from "@/lib/ai/constants";
import type { MessagingChannel } from "@/types/database.types";
import type { RoutableAiAgent } from "@/utils/ai-agent-routing";
import { isDefaultAgent } from "@/features/ai-assistant/agent-channel-routing";

export function hasEnabledChannelAgent(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
}): boolean {
  return input.agents.some(
    (agent) => agent.enabled && agent.channels.includes(input.channel),
  );
}

export function selectDefaultChannelAgent(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
}): RoutableAiAgent | null {
  const eligible = input.agents.filter(
    (agent) => agent.enabled && agent.channels.includes(input.channel),
  );

  const defaultAgents = eligible
    .filter((agent) => isDefaultAgent(agent.triggerKeywords))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  if (defaultAgents[0]) {
    return defaultAgents[0];
  }

  const specialists = eligible.sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  );

  return specialists[0] ?? null;
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
