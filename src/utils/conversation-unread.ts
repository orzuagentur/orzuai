import type { ConversationListItem } from "@/types/chat.types";
import type {
  ConversationStatus,
  MessageSenderType,
  MessagingChannel,
} from "@/types/database.types";

const OPEN_STATUSES = new Set<ConversationStatus>([
  "open",
  "active",
  "pending",
]);

export function isConversationUnread(input: {
  lastMessageSenderType: MessageSenderType | null;
  lastMessageAt: string | null;
  lastReadAt: string | null;
  status: ConversationStatus;
}): boolean {
  if (input.lastMessageSenderType !== "client") {
    return false;
  }

  if (!OPEN_STATUSES.has(input.status)) {
    return false;
  }

  if (!input.lastMessageAt) {
    return false;
  }

  if (!input.lastReadAt) {
    return true;
  }

  return (
    new Date(input.lastMessageAt).getTime() >
    new Date(input.lastReadAt).getTime()
  );
}

export function withConversationUnread(
  conversation: Omit<ConversationListItem, "isUnread"> & {
    lastReadAt?: string | null;
  },
): ConversationListItem {
  const { lastReadAt, ...rest } = conversation;

  return {
    ...rest,
    isUnread: isConversationUnread({
      lastMessageSenderType: rest.lastMessageSenderType,
      lastMessageAt: rest.lastMessageAt,
      lastReadAt: lastReadAt ?? null,
      status: rest.status,
    }),
  };
}

export function countUnreadByChannel(
  conversations: ConversationListItem[],
): Partial<Record<MessagingChannel, number>> {
  const counts: Partial<Record<MessagingChannel, number>> = {};

  for (const conversation of conversations) {
    if (!conversation.isUnread) {
      continue;
    }

    counts[conversation.channel] = (counts[conversation.channel] ?? 0) + 1;
  }

  return counts;
}

export function markConversationListItemRead(
  conversations: ConversationListItem[],
  conversationId: string,
): ConversationListItem[] {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? { ...conversation, isUnread: false }
      : conversation,
  );
}
