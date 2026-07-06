"use server";

import { disconnectWebsiteChat } from "@/services/website-chat.service";

export async function disconnectWebsiteChatAction() {
  return disconnectWebsiteChat();
}
