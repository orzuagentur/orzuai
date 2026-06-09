"use server";

import { resolveChatMediaUrl } from "@/services/chat-media-url.service";

export async function getChatMediaUrlAction(input: {
  path?: string;
  url?: string;
}) {
  return resolveChatMediaUrl(input);
}
