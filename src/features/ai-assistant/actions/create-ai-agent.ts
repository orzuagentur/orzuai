"use server";

import { createAiAgent } from "@/services/ai-agents.service";
import type {
  AiAgentActionResult,
  CreateAiAgentInput,
} from "@/types/ai-agent.types";

export async function createAiAgentAction(
  input: CreateAiAgentInput,
): Promise<AiAgentActionResult> {
  return createAiAgent(input);
}
