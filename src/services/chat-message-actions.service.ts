import "server-only";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  DeleteChatMessageInput,
  DeleteChatMessageResult,
} from "@/types/chat.types";
import { deleteChatMessageSchema } from "@/types/chat.types";
import { mapChatMessage } from "@/utils/chat";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

async function getOwnedMessage(messageId: string) {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, deleted_for_all_at, hidden_for_business, edited_at, is_edited, created_at",
    )
    .eq("id", messageId)
    .maybeSingle();

  if (!row) {
    return null;
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("business_id")
    .eq("id", row.conversation_id)
    .maybeSingle();

  if (!conversation || conversation.business_id !== businessId) {
    return null;
  }

  return mapChatMessage(row);
}

export async function deleteChatMessage(
  input: DeleteChatMessageInput,
): Promise<DeleteChatMessageResult> {
  const parsed = deleteChatMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ?? CHAT_MESSAGES.messageDeleteFailed,
      },
    };
  }

  const message = await getOwnedMessage(parsed.data.messageId);

  if (!message) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CHAT_MESSAGES.messageNotFound },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ hidden_for_business: true })
    .eq("id", parsed.data.messageId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CHAT_MESSAGES.messageDeleteFailed },
    };
  }

  return { success: true, data: { messageId: parsed.data.messageId } };
}
