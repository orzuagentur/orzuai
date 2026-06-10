"use client";

import { FollowUpAgentPanel } from "@/components/ai-assistant/FollowUpAgentPanel";
import { AiUsageLimitsPanel } from "@/components/ai-assistant/AiUsageLimitsPanel";
import { SalesAgentPanel } from "@/components/ai-assistant/SalesAgentPanel";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";

type AiAutomationPanelProps = {
  usage: AiAssistantPageData["usage"];
  salesAgent: AiAssistantPageData["salesAgent"];
  followUpAgent: AiAssistantPageData["followUpAgent"];
};

export function AiAutomationPanel({
  usage,
  salesAgent,
  followUpAgent,
}: AiAutomationPanelProps) {
  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <p className="text-sm text-muted-foreground">
        {AI_ASSISTANT_MESSAGES.automationIntro}
      </p>

      <AiUsageLimitsPanel usage={usage} />
      <SalesAgentPanel settings={salesAgent} />
      <FollowUpAgentPanel settings={followUpAgent} />
    </div>
  );
}
