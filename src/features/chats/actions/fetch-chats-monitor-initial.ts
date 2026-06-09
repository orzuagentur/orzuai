"use server";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { getChatsMonitorPageData } from "@/services/chat.service";

export async function fetchChatsMonitorInitialAction() {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  try {
    const data = await getChatsMonitorPageData();

    return {
      success: true as const,
      data,
    };
  } catch {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }
}
