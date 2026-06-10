import type { ConversationListItem } from "@/types/chat.types";
import type { ConversationStatus, MessagingChannel } from "@/types/database.types";

const OPEN_STATUSES = new Set<ConversationStatus>([
  "open",
  "active",
  "pending",
]);

export function isConversationUnread(input: {
  lastClientMessageAt: string | null;
  lastReadAt: string | null;
  status: ConversationStatus;
}): boolean {
  if (!OPEN_STATUSES.has(input.status)) {
    return false;
  }

  if (!input.lastClientMessageAt) {
    return false;
  }

  if (!input.lastReadAt) {
    return true;
  }

  return (
    new Date(input.lastClientMessageAt).getTime() >
    new Date(input.lastReadAt).getTime()
  );
}

export function withConversationUnread(
  conversation: Omit<ConversationListItem, "isUnread"> & {
    lastReadAt?: string | null;
  },
): ConversationListItem {
  const { lastReadAt, ...rest } = conversation;

  const unreadMessageCount = rest.unreadMessageCount ?? 0;

  return {
    ...rest,
    unreadMessageCount,
    isUnread:
      unreadMessageCount > 0 ||
      isConversationUnread({
        lastClientMessageAt: rest.lastClientMessageAt,
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
    if (conversation.unreadMessageCount <= 0) {
      continue;
    }

    counts[conversation.channel] =
      (counts[conversation.channel] ?? 0) + conversation.unreadMessageCount;
  }

  return counts;
}

export function countChannelsWithUnread(
  unreadByChannel: Partial<Record<MessagingChannel, number>>,
): number {
  return Object.values(unreadByChannel).filter((count) => (count ?? 0) > 0)
    .length;
}

export function markConversationListItemRead(
  conversations: ConversationListItem[],
  conversationId: string,
): ConversationListItem[] {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? { ...conversation, isUnread: false, unreadMessageCount: 0 }
      : conversation,
  );
}
