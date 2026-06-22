"use server";

import { testAgentWizardReply } from "@/services/agent-wizard-test.service";
import type { TestAgentWizardReplyInput } from "@/types/ai-agent.types";

export async function testAgentWizardReplyAction(
  input: TestAgentWizardReplyInput,
): Promise<
  | { success: true; reply: string; provider: string; model: string }
  | { success: false; message: string }
> {
  return testAgentWizardReply(input);
}
