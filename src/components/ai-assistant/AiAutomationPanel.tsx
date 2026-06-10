"use client";

import { FollowUpAgentPanel } from "@/components/ai-assistant/FollowUpAgentPanel";
import { AiUsageLimitsPanel } from "@/components/ai-assistant/AiUsageLimitsPanel";
import { SalesAgentPanel } from "@/components/ai-assistant/SalesAgentPanel";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import type { AutomationsPageData } from "@/types/automations.types";

type AiAutomationPanelProps = {
  usage: AutomationsPageData["usage"];
  salesAgent: AutomationsPageData["salesAgent"];
  followUpAgent: AutomationsPageData["followUpAgent"];
};

export function AiAutomationPanel({
  usage,
  salesAgent,
  followUpAgent,
}: AiAutomationPanelProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {AUTOMATIONS_MESSAGES.aiRulesTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {AUTOMATIONS_MESSAGES.aiRulesIntro}
        </p>
      </div>

      <AiUsageLimitsPanel usage={usage} />
      <SalesAgentPanel settings={salesAgent} />
      <FollowUpAgentPanel settings={followUpAgent} />
    </div>
  );
}
