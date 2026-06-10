"use client";

import Link from "next/link";

import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";
import {
  AI_ASSISTANT_TABS,
  buildAiAssistantHref,
  type AiAssistantTab,
} from "@/utils/ai-assistant-url";

type AiAssistantSectionTabsProps = {
  activeTab: AiAssistantTab;
  activeChannel: MessagingChannel | null;
  activeAgentId: string | null;
  searchQuery: string;
};

const TAB_LABELS: Record<AiAssistantTab, string> = {
  agents: AI_ASSISTANT_MESSAGES.tabAgents,
  automation: AI_ASSISTANT_MESSAGES.tabAutomation,
  channels: AI_ASSISTANT_MESSAGES.tabChannels,
};

export function AiAssistantSectionTabs({
  activeTab,
  activeChannel,
  activeAgentId,
  searchQuery,
}: AiAssistantSectionTabsProps) {
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b px-4 py-2">
      {AI_ASSISTANT_TABS.map((tab) => {
        const isActive = activeTab === tab;

        return (
          <Link
            key={tab}
            href={buildAiAssistantHref({
              channel: activeChannel,
              tab,
              agent: tab === "agents" ? activeAgentId : null,
              q: tab === "agents" ? searchQuery || null : null,
            })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {TAB_LABELS[tab]}
          </Link>
        );
      })}
    </div>
  );
}
