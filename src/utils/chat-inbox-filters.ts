import type { ChatInboxFilter } from "@/features/chats/constants";
import type { ConversationListItem } from "@/types/chat.types";

export function filterConversations(
  conversations: ConversationListItem[],
  {
    filter,
  }: {
    filter: ChatInboxFilter;
  },
): ConversationListItem[] {
  return conversations.filter((conversation) => {
    if (filter === "ai_handled") {
      return conversation.lastMessageSenderType === "ai";
    }

    if (filter === "needs_human") {
      return conversation.lastMessageSenderType === "client";
    }

    if (filter === "active") {
      return conversation.status === "active" || conversation.status === "open";
    }

    return true;
  });
}
