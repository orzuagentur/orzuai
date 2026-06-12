"use client";

import Link from "next/link";

import { AiAgentChannelIconRow } from "@/components/ai-assistant/AiAgentChannelIconRow";
import { AiAgentIcon } from "@/components/ai-assistant/AiAgentIcon";
import { Badge } from "@/components/ui/badge";
import { isDefaultAgent } from "@/features/ai-assistant/agent-channel-routing";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { cn } from "@/lib/utils";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentListPanelProps = {
  agents: AiAgentItem[];
  activeChannelFilter: MessagingIntegrationChannelId | null;
  activeAgentId: string | null;
  isNewAgent: boolean;
  searchQuery: string;
  activeTab: "agents";
};

function matchesSearch(agent: AiAgentItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    agent.name,
    agent.systemPrompt,
    ...agent.triggerKeywords,
    ...agent.channels,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function matchesChannel(
  agent: AiAgentItem,
  channel: MessagingIntegrationChannelId | null,
): boolean {
  if (!channel) {
    return true;
  }

  return agent.channels.includes(channel);
}

export function AiAgentListPanel({
  agents,
  activeChannelFilter,
  activeAgentId,
  isNewAgent,
  searchQuery,
  activeTab,
}: AiAgentListPanelProps) {
  const filteredAgents = agents.filter(
    (agent) =>
      matchesChannel(agent, activeChannelFilter) &&
      matchesSearch(agent, searchQuery),
  );

  function hrefForAgent(agentId: string | null) {
    return buildAiAssistantHref({
      channel: activeChannelFilter,
      tab: activeTab,
      agent: agentId,
      q: searchQuery || null,
    });
  }

  if (filteredAgents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {searchQuery
          ? AI_ASSISTANT_MESSAGES.noAgentsFiltered
          : AI_ASSISTANT_MESSAGES.noAgents}
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {filteredAgents.map((agent) => {
        const isActive = activeAgentId === agent.id && !isNewAgent;

        return (
          <li key={agent.id}>
            <Link
              href={hrefForAgent(agent.id)}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                isActive && "bg-primary/5",
              )}
            >
              <div className="relative shrink-0">
                <AiAgentIcon iconId={agent.icon} size="md" />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                    agent.enabled ? "bg-emerald-500" : "bg-neutral-900",
                  )}
                  title={
                    agent.enabled
                      ? AI_ASSISTANT_MESSAGES.agentEnabled
                      : AI_ASSISTANT_MESSAGES.agentDisabled
                  }
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{agent.name}</p>
                  <Badge
                    variant={isDefaultAgent(agent.triggerKeywords) ? "default" : "secondary"}
                    className="shrink-0 text-[10px]"
                  >
                    {isDefaultAgent(agent.triggerKeywords)
                      ? AI_ASSISTANT_MESSAGES.agentDefaultBadge
                      : AI_ASSISTANT_MESSAGES.agentSpecialistBadge}
                  </Badge>
                </div>
                <p className="text-caption line-clamp-1">
                  {agent.triggerKeywords.length > 0
                    ? agent.triggerKeywords.join(", ")
                    : AI_ASSISTANT_MESSAGES.agentDefaultSummary}
                </p>
                <AiAgentChannelIconRow channels={agent.channels} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
