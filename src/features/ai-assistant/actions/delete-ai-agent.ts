"use server";

import { deleteAiAgent } from "@/services/ai-agents.service";
import type {
  AiAgentActionResult,
  DeleteAiAgentInput,
} from "@/types/ai-agent.types";

export async function deleteAiAgentAction(
  input: DeleteAiAgentInput,
): Promise<AiAgentActionResult> {
  return deleteAiAgent(input);
}
