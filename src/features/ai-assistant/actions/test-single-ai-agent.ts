"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import type { AgentCrmPreview } from "@/types/ai-agent-test.types";
import type { AssistantAgentTestResult } from "@/types/ai-agent-test.types";
import { runAssistantAgentTest } from "@/services/ai-agent-test.service";

const testSingleAiAgentSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(20)
    .optional(),
});

export async function testSingleAiAgentAction(input: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<
  | {
      success: true;
      reply: string;
      model: string;
      provider: string;
      crmPreview: AgentCrmPreview | null;
    }
  | { success: false; message: string }
> {
  const parsed = testSingleAiAgentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Enter a test message.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const result: AssistantAgentTestResult = await runAssistantAgentTest({
    admin: createAdminClient(),
    businessId: business.id,
    clientMessage: parsed.data.message,
    conversationHistory: parsed.data.history ?? [],
  });

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    reply: result.reply,
    model: result.model,
    provider: result.provider,
    crmPreview: result.crmPreview,
  };
}
