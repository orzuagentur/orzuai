"use server";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  listConversationsPage,
  type InboxQuickView,
} from "@/services/chat-inbox-query.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { hasSupabaseEnv } from "@/lib/env";

const fetchMonitorConversationsSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(50),
  channel: z
    .enum(["whatsapp", "telegram", "instagram", "website_forms"])
    .optional(),
  search: z.string().max(200).optional(),
  view: z.enum(["all", "needs_reply", "high_intent"]).default("all"),
  filter: z
    .enum(["all", "ai_handled", "needs_human", "active"])
    .default("all"),
  sort: z.enum(["latest", "needs_reply_first", "channel"]).default("latest"),
});

export type FetchMonitorConversationsInput = z.infer<
  typeof fetchMonitorConversationsSchema
>;

export async function fetchMonitorConversationsAction(
  input: FetchMonitorConversationsInput,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = fetchMonitorConversationsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: {
        message: parsed.error.issues[0]?.message ?? CHAT_MESSAGES.genericError,
      },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.noBusinessDescription },
    };
  }

  const result = await listConversationsPage(business.id, {
    offset: parsed.data.offset,
    limit: parsed.data.limit,
    channel: parsed.data.channel,
    search: parsed.data.search,
    view: parsed.data.view as InboxQuickView,
    filter: parsed.data.filter,
    sort: parsed.data.sort,
  });

  return {
    success: true as const,
    data: result,
  };
}
