"use server";

import { regenerateWebsiteChatApiKey } from "@/services/website-chat.service";

export async function regenerateWebsiteChatApiKeyAction() {
  return regenerateWebsiteChatApiKey();
}
