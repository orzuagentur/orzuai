"use server";

import { z } from "zod";

import { isChatChannelId } from "@/features/chats";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getChatsChannelPageData,
  getChatsMonitorData,
} from "@/services/chat.service";

const fetchChatsChannelInitialSchema = z.object({
  channel: z.enum(["whatsapp", "telegram", "instagram", "website_forms"]),
});

export async function fetchChatsChannelInitialAction(
  input: z.infer<typeof fetchChatsChannelInitialSchema>,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = fetchChatsChannelInitialSchema.safeParse(input);

  if (!parsed.success || !isChatChannelId(parsed.data.channel)) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }

  try {
    const channel = parsed.data.channel;
    const [monitorData, channelData] = await Promise.all([
      getChatsMonitorData(),
      getChatsChannelPageData(channel),
    ]);

    return {
      success: true as const,
      data: {
        channelStats: monitorData.channels,
        ...channelData,
      },
    };
  } catch {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }
}
