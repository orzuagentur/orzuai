export const CONVERSATION_TYPING_EVENT = "typing";

export type ConversationTypingSender = "agent" | "client";

export type ConversationTypingPayload = {
  sender: ConversationTypingSender;
  isTyping: boolean;
  at: number;
};

export function getConversationRealtimeChannelName(
  conversationId: string,
): string {
  return `conversation:${conversationId}`;
}
