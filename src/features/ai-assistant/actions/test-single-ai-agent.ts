"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { generateFastAssistantReply } from "@/services/auto-reply-pipeline.service";

const testSingleAiAgentSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export async function testSingleAiAgentAction(input: {
  message: string;
}): Promise<
  | { success: true; reply: string; model: string; provider: string }
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

  const reply = await generateFastAssistantReply({
    admin: createAdminClient(),
    businessId: business.id,
    channel: "whatsapp",
    clientMessage: parsed.data.message,
    requireAiEnabled: false,
  });

  if (!reply.success) {
    return {
      success: false,
      message:
        reply.message ??
        "AI Agent could not generate a reply. Check provider configuration.",
    };
  }

  return {
    success: true,
    reply: reply.text,
    model: reply.model,
    provider: reply.provider,
  };
}
