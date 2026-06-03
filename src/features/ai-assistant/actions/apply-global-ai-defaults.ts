"use server";

import { applyGlobalAiDefaults } from "@/services/ai-assistant.service";
import type { ApplyGlobalAiDefaultsInput } from "@/types/channel-workspace.types";

export async function applyGlobalAiDefaultsAction(
  input: ApplyGlobalAiDefaultsInput,
): Promise<{ success: boolean; message?: string }> {
  return applyGlobalAiDefaults(input);
}
