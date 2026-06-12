"use server";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getConversationMessagesTail } from "@/services/chat.service";

const fetchRecentMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  limit: z.number().int().min(1).max(40).optional(),
});

export async function fetchRecentConversationMessagesAction(
  input: z.infer<typeof fetchRecentMessagesSchema>,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = fetchRecentMessagesSchema.safeParse(input);

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

  const messages = await getConversationMessagesTail(
    parsed.data.conversationId,
    business.id,
    parsed.data.limit ?? 20,
  );

  if (!messages) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }

  return {
    success: true as const,
    data: { messages },
  };
}
