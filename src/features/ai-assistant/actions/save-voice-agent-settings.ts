"use server";

import { saveVoiceAgentSettings } from "@/services/ai-assistant-profile.service";
import type { SaveVoiceAgentSettingsInput } from "@/types/elevenlabs.types";

export async function saveVoiceAgentSettingsAction(
  input: SaveVoiceAgentSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  return saveVoiceAgentSettings(input);
}
