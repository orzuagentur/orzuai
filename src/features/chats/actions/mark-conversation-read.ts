"use server";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { markConversationRead } from "@/services/conversation-read.service";

const markConversationReadSchema = z.object({
  conversationId: z.string().uuid(),
});

export async function markConversationReadAction(
  input: z.infer<typeof markConversationReadSchema>,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = markConversationReadSchema.safeParse(input);

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

  const readAt = new Date().toISOString();
  await markConversationRead(business.id, parsed.data.conversationId, user.id);

  return {
    success: true as const,
    data: { readAt },
  };
}
