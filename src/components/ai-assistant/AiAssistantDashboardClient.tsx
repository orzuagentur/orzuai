"use client";

import { useRouter } from "next/navigation";

import { AgentDashboardPanel } from "@/components/ai-assistant/AgentDashboardPanel";
import { navigateToAiAssistantTab } from "@/components/ai-assistant/AiAssistantTabBar";
import type { AiAgentTab } from "@/types/agent-dashboard.types";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";

type AiAssistantDashboardClientProps = {
  data: AiAssistantPageData;
};

export function AiAssistantDashboardClient({
  data,
}: AiAssistantDashboardClientProps) {
  const router = useRouter();

  function handleNavigate(tab: AiAgentTab) {
    router.push(navigateToAiAssistantTab(tab));
  }

  return (
    <AgentDashboardPanel
      data={data}
      stats={data.agentDashboardStats}
      recentDialogues={data.recentDialogues}
      aiActivity={data.aiActivity}
      onNavigate={handleNavigate}
    />
  );
}
