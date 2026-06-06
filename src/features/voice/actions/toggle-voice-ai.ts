"use server";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { setVoiceAiEnabled } from "@/services/voice-agent.service";
import { toggleVoiceAiSchema } from "@/types/voice-agent.types";

export async function toggleVoiceAiAction(
  aiEnabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const parsed = toggleVoiceAiSchema.safeParse({ aiEnabled });

  if (!parsed.success) {
    return { success: false, message: "Invalid setting." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return setVoiceAiEnabled(business.id, parsed.data.aiEnabled);
}
