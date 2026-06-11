"use server";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { getOlderConversationMessages } from "@/services/chat.service";

const fetchOlderMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  beforeCreatedAt: z.string().min(1),
});

export async function fetchOlderConversationMessagesAction(
  input: z.infer<typeof fetchOlderMessagesSchema>,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = fetchOlderMessagesSchema.safeParse(input);

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

  const result = await getOlderConversationMessages(
    parsed.data.conversationId,
    business.id,
    parsed.data.beforeCreatedAt,
  );

  if (!result) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }

  return {
    success: true as const,
    data: result,
  };
}
