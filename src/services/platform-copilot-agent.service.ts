import "server-only";

import { parseCopilotAgentResponse } from "@/lib/platform-copilot/parse-agent-response";
import {
  buildPlatformCopilotAgentInstruction,
  buildPlatformCopilotAgentPrompt,
} from "@/lib/platform-copilot/agent-prompts";
import { generateTextWithFallback } from "@/services/llm.service";
import { buildPlatformCopilotContextBlock } from "@/services/platform-copilot-context.service";
import type {
  CopilotAgentResponse,
  PlatformCopilotMode,
} from "@/types/platform-copilot.types";

export async function planPlatformCopilotActions(input: {
  businessId: string;
  question: string;
  currentPath: string;
  mode: PlatformCopilotMode;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<
  | { success: true; data: CopilotAgentResponse }
  | { success: false; message: string }
> {
  const contextBlock = await buildPlatformCopilotContextBlock(input.businessId);

  const result = await generateTextWithFallback({
    businessId: input.businessId,
    callType: "other",
    preferredProvider: "gemini",
    systemInstruction: buildPlatformCopilotAgentInstruction(input.mode),
    prompt: buildPlatformCopilotAgentPrompt({
      question: input.question,
      currentPath: input.currentPath,
      mode: input.mode,
      history: (input.history ?? []).slice(-8),
      contextBlock,
    }),
  });

  if (!result.success) {
    return { success: false, message: result.error.message };
  }

  return {
    success: true,
    data: parseCopilotAgentResponse(result.data.text),
  };
}
