import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getConversationMessagesTail,
  getNewConversationMessages,
} from "@/services/chat.service";
import { updateConversationSyncCursor } from "@/services/conversation-sync.service";
import type { ConversationReconnectCursor } from "@/lib/realtime/conversation-channel";
import type { ChatMessageData } from "@/types/chat.types";

export type { ConversationReconnectCursor };

export type ConversationGapSyncResult = {
  newMessages: ChatMessageData[];
  recentMessages: ChatMessageData[];
  cursor: ConversationReconnectCursor;
};

export async function syncConversationMessageGap(
  conversationId: string,
  businessId: string,
  cursor: ConversationReconnectCursor,
  options?: { recentTailLimit?: number },
): Promise<ConversationGapSyncResult | null> {
  const [newMessages, recentMessages] = await Promise.all([
    getNewConversationMessages(
      conversationId,
      businessId,
      cursor.afterCreatedAt,
      cursor.afterMessageId ?? undefined,
    ),
    getConversationMessagesTail(
      conversationId,
      businessId,
      options?.recentTailLimit ?? 30,
    ),
  ]);

  if (!newMessages || !recentMessages) {
    return null;
  }

  const lastNewMessage = newMessages.at(-1);

  if (lastNewMessage) {
    await updateConversationSyncCursor(createAdminClient(), {
      conversationId,
      businessId,
      lastMessageAt: lastNewMessage.sentAt,
      lastMessageId: lastNewMessage.id,
    });
  }

  const tailCursor = recentMessages.at(-1);

  return {
    newMessages,
    recentMessages,
    cursor: lastNewMessage
      ? {
          afterCreatedAt: lastNewMessage.sentAt,
          afterMessageId: lastNewMessage.id,
        }
      : tailCursor
        ? {
            afterCreatedAt: tailCursor.sentAt,
            afterMessageId: tailCursor.id,
          }
        : cursor,
  };
}
