"use server";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { updateConversationSyncCursor } from "@/services/conversation-sync.service";
import { getNewConversationMessages } from "@/services/chat.service";

const fetchNewMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  afterCreatedAt: z.string().min(1),
  afterMessageId: z.string().uuid().optional(),
});

export async function fetchNewConversationMessagesAction(
  input: z.infer<typeof fetchNewMessagesSchema>,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = fetchNewMessagesSchema.safeParse(input);

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

  const messages = await getNewConversationMessages(
    parsed.data.conversationId,
    business.id,
    parsed.data.afterCreatedAt,
    parsed.data.afterMessageId,
  );

  if (!messages) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }

  if (messages.length > 0) {
    const lastMessage = messages.at(-1)!;

    await updateConversationSyncCursor(createAdminClient(), {
      conversationId: parsed.data.conversationId,
      businessId: business.id,
      lastMessageAt: lastMessage.createdAt,
      lastMessageId: lastMessage.id,
    });
  }

  return {
    success: true as const,
    data: { messages },
  };
}
