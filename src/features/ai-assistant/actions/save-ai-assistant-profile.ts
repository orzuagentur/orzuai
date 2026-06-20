"use server";

import { saveAiAssistantProfile } from "@/services/ai-assistant-profile.service";
import type { SaveAiAssistantProfileInput } from "@/types/ai-assistant-profile.types";

export async function saveAiAssistantProfileAction(
  input: SaveAiAssistantProfileInput,
): Promise<{ success: boolean; message?: string }> {
  return saveAiAssistantProfile(input);
}
