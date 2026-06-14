export const CONVERSATION_TYPING_EVENT = "typing";
export const CONVERSATION_MESSAGE_UPDATED_EVENT = "message_updated";
export const CONVERSATION_DELIVERY_STATUS_EVENT = "delivery_status";

export type ConversationDeliveryStatusPayload = {
  conversation_id: string;
  message_id: string;
  status: import("@/types/database.types").MessageDeliveryStatus;
};

export type ConversationTypingSender = "agent" | "client";

export type ConversationTypingPayload = {
  sender: ConversationTypingSender;
  isTyping: boolean;
  at: number;
};

export type ConversationMessageUpdatedPayload = {
  id: string;
  conversation_id: string;
  channel: import("@/types/database.types").MessagingChannel;
  sender_type: import("@/types/database.types").MessageSenderType;
  content: string;
  ai_generated: boolean;
  created_at: string;
  deleted_for_all_at?: string | null;
  hidden_for_business?: boolean;
  edited_at?: string | null;
  is_edited?: boolean;
  attachment_pending?: boolean;
  attachment_failed?: boolean;
};

export type ConversationReconnectCursor = {
  afterCreatedAt: string;
  afterMessageId: string | null;
};

export type ConversationGapSyncPayload = {
  newMessages: import("@/types/chat.types").ChatMessageData[];
  recentMessages: import("@/types/chat.types").ChatMessageData[];
  cursor: ConversationReconnectCursor;
};

export function getConversationRealtimeChannelName(
  conversationId: string,
): string {
  return `conversation:${conversationId}`;
}
