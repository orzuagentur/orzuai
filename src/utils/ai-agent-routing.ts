import { buildEffectiveAgentPrompt } from "@/features/ai-assistant/communication-styles";
import type { MessagingChannel } from "@/types/database.types";

export type RoutableAiAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  channels: MessagingChannel[];
  triggerKeywords: string[];
  enabled: boolean;
  provider?: string;
  model?: string;
  useCustomModel?: boolean;
  language?: string;
  communicationStyle?: string;
  updatedAt?: string;
};

export type AgentMatchResult = {
  agent: RoutableAiAgent | null;
  systemPrompt: string;
};

function countKeywordMatches(messageLower: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    const normalized = keyword.trim().toLowerCase();

    if (!normalized) {
      return count;
    }

    return messageLower.includes(normalized) ? count + 1 : count;
  }, 0);
}

function longestMatchedKeywordLength(
  messageLower: string,
  keywords: string[],
): number {
  return keywords.reduce((max, keyword) => {
    const normalized = keyword.trim().toLowerCase();

    if (!normalized || !messageLower.includes(normalized)) {
      return max;
    }

    return Math.max(max, normalized.length);
  }, 0);
}

export function resolveAgentMatch(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
  message: string;
}): RoutableAiAgent | null {
  const messageLower = input.message.toLowerCase();
  const eligible = input.agents.filter(
    (agent) => agent.enabled && agent.channels.includes(input.channel),
  );

  const keywordAgents = eligible.filter(
    (agent) => agent.triggerKeywords.length > 0,
  );

  const keywordMatches = keywordAgents
    .map((agent) => ({
      agent,
      matchCount: countKeywordMatches(messageLower, agent.triggerKeywords),
      longestKeyword: longestMatchedKeywordLength(
        messageLower,
        agent.triggerKeywords,
      ),
    }))
    .filter((entry) => entry.matchCount > 0)
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }

      if (b.longestKeyword !== a.longestKeyword) {
        return b.longestKeyword - a.longestKeyword;
      }

      const aUpdated = a.agent.updatedAt ?? "";
      const bUpdated = b.agent.updatedAt ?? "";

      return bUpdated.localeCompare(aUpdated);
    });

  if (keywordMatches.length > 0) {
    return keywordMatches[0]!.agent;
  }

  const defaultAgents = eligible
    .filter((agent) => agent.triggerKeywords.length === 0)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  return defaultAgents[0] ?? null;
}

export function resolveAgentSystemPrompt(input: {
  agents: RoutableAiAgent[];
  channel: MessagingChannel;
  message: string;
  fallbackPrompt: string;
}): AgentMatchResult {
  const agent = resolveAgentMatch({
    agents: input.agents,
    channel: input.channel,
    message: input.message,
  });

  return {
    agent,
    systemPrompt: agent
      ? buildEffectiveAgentPrompt({
          systemPrompt: agent.systemPrompt,
          communicationStyle: agent.communicationStyle,
        })
      : input.fallbackPrompt,
  };
}
