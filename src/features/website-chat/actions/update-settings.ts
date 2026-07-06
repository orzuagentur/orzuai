"use server";

import { updateWebsiteChatSettingsSchema } from "@/types/website-chat.types";
import { updateWebsiteChatSettings } from "@/services/website-chat.service";

export async function updateWebsiteChatSettingsAction(input: unknown) {
  const parsed = updateWebsiteChatSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: "Invalid settings." };
  }

  return updateWebsiteChatSettings(parsed.data);
}
