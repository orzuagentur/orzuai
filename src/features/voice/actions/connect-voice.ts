"use server";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  connectVoiceAgent,
  disconnectVoiceAgent,
} from "@/services/voice-agent.service";
import type { ConnectVoiceAgentInput } from "@/types/voice-agent.types";
import { connectVoiceAgentSchema } from "@/types/voice-agent.types";

export async function connectVoiceAgentAction(
  input: ConnectVoiceAgentInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = connectVoiceAgentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid phone number.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return connectVoiceAgent(business.id, parsed.data);
}

export async function disconnectVoiceAgentAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return disconnectVoiceAgent(business.id);
}
