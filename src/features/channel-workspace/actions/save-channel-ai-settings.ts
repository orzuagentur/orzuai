"use server";

import { saveChannelAiSettings } from "@/services/channel-workspace.service";
import type { SaveChannelAiSettingsInput } from "@/types/channel-workspace.types";

export async function saveChannelAiSettingsAction(
  input: SaveChannelAiSettingsInput,
): Promise<{ success: boolean; message?: string }> {
  return saveChannelAiSettings(input);
}
