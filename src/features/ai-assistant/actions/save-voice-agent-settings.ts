"use server";

import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { saveVoiceAgentSettings } from "@/services/voice-agent.service";
import type { SaveVoiceAgentSettingsInput } from "@/types/voice-agent.types";
import { saveVoiceAgentSettingsSchema } from "@/types/voice-agent.types";

export async function saveVoiceAgentSettingsAction(
  input: SaveVoiceAgentSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveVoiceAgentSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { success: false, message: "Business not found." };
  }

  return saveVoiceAgentSettings(business.id, parsed.data);
}
