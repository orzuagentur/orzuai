"use server";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getConversationListItem } from "@/services/chat-inbox-query.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { hasSupabaseEnv } from "@/lib/env";

const schema = z.object({
  conversationId: z.string().uuid(),
});

export async function fetchConversationListItemAction(
  input: z.infer<typeof schema>,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = schema.safeParse(input);

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

  const item = await getConversationListItem(
    business.id,
    parsed.data.conversationId,
  );

  if (!item) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }

  return {
    success: true as const,
    data: item,
  };
}
