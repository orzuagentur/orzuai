"use server";

import { websiteChatAppearanceSchema } from "@/types/website-chat.types";
import { enableWebsiteChat } from "@/services/website-chat.service";

export async function enableWebsiteChatAction(input?: unknown) {
  if (input === undefined) {
    return enableWebsiteChat();
  }

  const parsed = websiteChatAppearanceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: { code: "INVALID_INPUT", message: "Invalid widget settings." },
    };
  }

  return enableWebsiteChat(parsed.data);
}
