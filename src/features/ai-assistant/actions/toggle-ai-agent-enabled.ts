"use server";

import { toggleAiAgentEnabled } from "@/services/ai-agents.service";
import type { AiAgentActionResult } from "@/types/ai-agent.types";

export async function toggleAiAgentEnabledAction(input: {
  id: string;
  enabled: boolean;
}): Promise<AiAgentActionResult> {
  return toggleAiAgentEnabled(input);
}
