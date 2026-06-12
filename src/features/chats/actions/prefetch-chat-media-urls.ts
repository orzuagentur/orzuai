"use server";

import { resolveChatMediaUrlsBatch } from "@/services/chat-media-url.service";

export async function prefetchChatMediaUrlsAction(paths: string[]) {
  return resolveChatMediaUrlsBatch(paths);
}
