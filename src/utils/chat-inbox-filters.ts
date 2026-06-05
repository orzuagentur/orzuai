import type { ChatInboxFilter } from "@/features/chats/constants";
import type { ConversationListItem } from "@/types/chat.types";

export function filterConversations(
  conversations: ConversationListItem[],
  {
    searchQuery,
    filter,
  }: {
    searchQuery: string;
    filter: ChatInboxFilter;
  },
): ConversationListItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return conversations.filter((conversation) => {
    if (normalizedQuery) {
      const haystack = [
        conversation.contactName,
        conversation.contactPhone,
        conversation.lastMessagePreview ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

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
