"use server";

import { enableWebsiteChat } from "@/services/website-chat.service";

export async function enableWebsiteChatAction() {
  return enableWebsiteChat();
}
