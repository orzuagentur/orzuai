"use server";

import { updateAiAgent } from "@/services/ai-agents.service";
import type {
  AiAgentActionResult,
  UpdateAiAgentInput,
} from "@/types/ai-agent.types";

export async function updateAiAgentAction(
  input: UpdateAiAgentInput,
): Promise<AiAgentActionResult> {
  return updateAiAgent(input);
}
