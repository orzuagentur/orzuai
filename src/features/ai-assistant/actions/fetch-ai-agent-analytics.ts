"use server";

import { getAiAgentAnalytics } from "@/services/ai-agent-analytics.service";
import type { AiAgentAnalytics } from "@/types/ai-agent.types";

export async function fetchAiAgentAnalyticsAction(agentId: string): Promise<
  | { success: true; data: AiAgentAnalytics }
  | { success: false; error: { message: string } }
> {
  const data = await getAiAgentAnalytics(agentId);

  if (!data) {
    return {
      success: false,
      error: { message: "Unable to load agent analytics." },
    };
  }

  return { success: true, data };
}
