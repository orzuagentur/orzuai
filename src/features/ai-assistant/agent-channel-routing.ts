import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations/constants";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingChannel } from "@/types/database.types";

export type RoutableAgentRef = Pick<
  AiAgentItem,
  "id" | "name" | "channels" | "triggerKeywords"
>;

export type DefaultAgentConflict = {
  channel: MessagingChannel;
  existingAgentId: string;
  existingAgentName: string;
};

export function isDefaultAgent(triggerKeywords: string[]): boolean {
  return triggerKeywords.length === 0;
}

export function isSpecialistAgent(triggerKeywords: string[]): boolean {
  return triggerKeywords.length > 0;
}

export function getChannelLabel(channel: MessagingChannel): string {
  return (
    INTEGRATION_CHANNEL_LIST.find((entry) => entry.id === channel)?.label ??
    channel
  );
}

export function parseTriggerKeywordsInput(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function findDefaultAgentConflicts(
  agents: RoutableAgentRef[],
  candidate: {
    id?: string;
    channels: MessagingChannel[];
    triggerKeywords: string[];
  },
): DefaultAgentConflict[] {
  if (!isDefaultAgent(candidate.triggerKeywords)) {
    return [];
  }

  const conflicts: DefaultAgentConflict[] = [];

  for (const channel of candidate.channels) {
    const existing = agents.find(
      (agent) =>
        agent.id !== candidate.id &&
        agent.channels.includes(channel) &&
        isDefaultAgent(agent.triggerKeywords),
    );

    if (existing) {
      conflicts.push({
        channel,
        existingAgentId: existing.id,
        existingAgentName: existing.name,
      });
    }
  }

  return conflicts;
}

export function formatDefaultAgentConflictMessage(
  conflicts: DefaultAgentConflict[],
): string {
  if (conflicts.length === 0) {
    return "";
  }

  if (conflicts.length === 1) {
    const conflict = conflicts[0]!;
    return `“${conflict.existingAgentName}” is already the default agent for ${getChannelLabel(conflict.channel)}. Add trigger keywords to make this a specialist, or remove that channel.`;
  }

  const details = conflicts
    .map(
      (conflict) =>
        `${getChannelLabel(conflict.channel)} (“${conflict.existingAgentName}”)`,
    )
    .join(", ");

  return `Each channel can have only one default agent. Conflicts: ${details}. Add trigger keywords or change channels.`;
}

export function validateAgentChannelRouting(
  agents: RoutableAgentRef[],
  candidate: {
    id?: string;
    channels: MessagingChannel[];
    triggerKeywords: string[];
  },
): { valid: boolean; conflicts: DefaultAgentConflict[]; message: string } {
  const conflicts = findDefaultAgentConflicts(agents, candidate);

  return {
    valid: conflicts.length === 0,
    conflicts,
    message: formatDefaultAgentConflictMessage(conflicts),
  };
}
