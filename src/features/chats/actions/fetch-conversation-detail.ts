"use server";

import { z } from "zod";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { getActiveConversationContext } from "@/services/chat.service";

const fetchConversationDetailSchema = z.object({
  conversationId: z.string().uuid(),
});

export type FetchConversationDetailInput = z.infer<
  typeof fetchConversationDetailSchema
>;

export async function fetchConversationDetailAction(
  input: FetchConversationDetailInput,
) {
  if (!hasSupabaseEnv()) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.missingConfig },
    };
  }

  const parsed = fetchConversationDetailSchema.safeParse(input);

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

  const context = await getActiveConversationContext(
    parsed.data.conversationId,
    business.id,
  );

  if (!context) {
    return {
      success: false as const,
      error: { message: CHAT_MESSAGES.genericError },
    };
  }

  return {
    success: true as const,
    data: context,
  };
}
