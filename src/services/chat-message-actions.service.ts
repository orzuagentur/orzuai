import "server-only";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  ChatActionResult,
  DeleteChatMessageInput,
  DeleteChatMessageResult,
} from "@/types/chat.types";
import { deleteChatMessageSchema } from "@/types/chat.types";
import { z } from "zod";
import { retryInboundMediaHydration } from "@/services/inbound-media-hydration.service";
import { recomputeConversationLastMessageForBusiness } from "@/services/conversation-last-message.service";
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

  const businessId = await getOwnedBusinessId();

  if (businessId) {
    await recomputeConversationLastMessageForBusiness(
      message.conversationId,
      businessId,
    );
  }

  return { success: true, data: { messageId: parsed.data.messageId } };
}

const retryInboundMediaAttachmentSchema = z.object({
  messageId: z.string().uuid("Invalid message identifier."),
});

export async function retryInboundMediaAttachment(
  input: z.infer<typeof retryInboundMediaAttachmentSchema>,
): Promise<ChatActionResult<{ messageId: string }>> {
  const parsed = retryInboundMediaAttachmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ?? CHAT_MESSAGES.mediaLoadFailed,
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

  const result = await retryInboundMediaHydration(parsed.data.messageId);

  if (!result.success) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: result.error ?? CHAT_MESSAGES.mediaLoadFailed,
      },
    };
  }

  return {
    success: true,
    data: { messageId: parsed.data.messageId },
  };
}
