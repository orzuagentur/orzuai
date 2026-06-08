import type { ChatInboxSort } from "@/features/chats/constants";
import type { ConversationListItem } from "@/types/chat.types";
import type { ConversationStatus } from "@/types/database.types";

const OPEN_STATUSES = new Set<ConversationStatus>([
  "open",
  "active",
  "pending",
]);

export const NEEDS_ATTENTION_LIMIT = 8;

export function isConversationNeedsAttention(
  conversation: ConversationListItem,
): boolean {
  if (conversation.lastMessageSenderType !== "client") {
    return false;
  }

  return OPEN_STATUSES.has(conversation.status);
}

export function getConversationActivityTime(
  conversation: ConversationListItem,
): number {
  return new Date(
    conversation.lastMessageAt ?? conversation.updatedAt,
  ).getTime();
}

export function sortConversations(
  conversations: ConversationListItem[],
  sort: ChatInboxSort,
): ConversationListItem[] {
  const copy = [...conversations];

  if (sort === "needs_reply_first") {
    return copy.sort((left, right) => {
      const leftNeeds = isConversationNeedsAttention(left) ? 1 : 0;
      const rightNeeds = isConversationNeedsAttention(right) ? 1 : 0;

      if (leftNeeds !== rightNeeds) {
        return rightNeeds - leftNeeds;
      }

      return getConversationActivityTime(right) - getConversationActivityTime(left);
    });
  }

  if (sort === "channel") {
    return copy.sort((left, right) => {
      const byChannel = left.channel.localeCompare(right.channel);

      if (byChannel !== 0) {
        return byChannel;
      }

      return getConversationActivityTime(right) - getConversationActivityTime(left);
    });
  }

  return copy.sort(
    (left, right) =>
      getConversationActivityTime(right) - getConversationActivityTime(left),
  );
}

export function extractNeedsAttentionConversations(
  conversations: ConversationListItem[],
): {
  needsAttention: ConversationListItem[];
  remaining: ConversationListItem[];
} {
  const needsAttention: ConversationListItem[] = [];
  const remaining: ConversationListItem[] = [];
  const seen = new Set<string>();

  for (const conversation of conversations) {
    if (
      needsAttention.length < NEEDS_ATTENTION_LIMIT &&
      isConversationNeedsAttention(conversation)
    ) {
      needsAttention.push(conversation);
      seen.add(conversation.id);
    }
  }

  for (const conversation of conversations) {
    if (!seen.has(conversation.id)) {
      remaining.push(conversation);
    }
  }

  return { needsAttention, remaining };
}
