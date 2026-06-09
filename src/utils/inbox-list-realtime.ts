import type { ConversationListItem } from "@/types/chat.types";
import type {
  ConversationStatus,
  MessageSenderType,
  MessagingChannel,
} from "@/types/database.types";
import { getMessagePreviewText } from "@/utils/chat-media";
import {
  isConversationNeedsAttention,
  sortConversations,
} from "@/utils/chat-inbox-priority";
import { isConversationUnread } from "@/utils/conversation-unread";

export type InboxRealtimeMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: MessageSenderType;
  content: string;
  ai_generated: boolean;
  created_at: string;
};

export type InboxRealtimeConversationRow = {
  id: string;
  channel: MessagingChannel;
  status: ConversationStatus;
  updated_at: string;
  last_read_at: string | null;
};

function truncatePreview(content: string, maxLength = 80): string {
  const trimmed = content.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function buildPreviewFromMessage(content: string): string {
  return truncatePreview(getMessagePreviewText(content));
}

function resolveUnreadFromMessage(input: {
  conversationId: string;
  selectedConversationId: string | null;
  senderType: MessageSenderType;
  createdAt: string;
  status: ConversationStatus;
  lastReadAt: string | null;
}): boolean {
  if (input.conversationId === input.selectedConversationId) {
    return false;
  }

  return isConversationUnread({
    lastMessageSenderType: input.senderType,
    lastMessageAt: input.createdAt,
    lastReadAt: input.lastReadAt,
    status: input.status,
  });
}

export function applyRealtimeMessageToList(
  conversations: ConversationListItem[],
  message: InboxRealtimeMessageRow,
  options: {
    selectedConversationId: string | null;
    channelFilter?: MessagingChannel;
    lastReadAtByConversationId?: Record<string, string | null>;
  },
): {
  items: ConversationListItem[];
  found: boolean;
  updatedItem: ConversationListItem | null;
} {
  if (options.channelFilter && message.channel !== options.channelFilter) {
    return { items: conversations, found: true, updatedItem: null };
  }

  const existing = conversations.find(
    (conversation) => conversation.id === message.conversation_id,
  );

  if (!existing) {
    return { items: conversations, found: false, updatedItem: null };
  }

  const lastReadAt =
    options.lastReadAtByConversationId?.[existing.id] ??
    (options.selectedConversationId === existing.id ? message.created_at : null);

  const updatedItem: ConversationListItem = {
    ...existing,
    channel: message.channel,
    lastMessagePreview: buildPreviewFromMessage(message.content),
    lastMessageAt: message.created_at,
    lastMessageSenderType: message.sender_type,
    lastMessageAiGenerated: message.ai_generated,
    updatedAt: message.created_at,
    isUnread: resolveUnreadFromMessage({
      conversationId: existing.id,
      selectedConversationId: options.selectedConversationId,
      senderType: message.sender_type,
      createdAt: message.created_at,
      status: existing.status,
      lastReadAt,
    }),
  };

  const rest = conversations.filter(
    (conversation) => conversation.id !== existing.id,
  );
  const items = sortConversations([updatedItem, ...rest], "latest");

  return { items, found: true, updatedItem };
}

export function applyRealtimeConversationUpdate(
  conversations: ConversationListItem[],
  row: InboxRealtimeConversationRow,
  options: {
    selectedConversationId: string | null;
    channelFilter?: MessagingChannel;
  },
): {
  items: ConversationListItem[];
  found: boolean;
  updatedItem: ConversationListItem | null;
} {
  if (options.channelFilter && row.channel !== options.channelFilter) {
    return { items: conversations, found: true, updatedItem: null };
  }

  const existing = conversations.find((conversation) => conversation.id === row.id);

  if (!existing) {
    return { items: conversations, found: false, updatedItem: null };
  }

  const updatedItem: ConversationListItem = {
    ...existing,
    channel: row.channel,
    status: row.status,
    updatedAt: row.updated_at,
    isUnread:
      existing.lastMessageSenderType && existing.lastMessageAt
        ? resolveUnreadFromMessage({
            conversationId: row.id,
            selectedConversationId: options.selectedConversationId,
            senderType: existing.lastMessageSenderType,
            createdAt: existing.lastMessageAt,
            status: row.status,
            lastReadAt: row.last_read_at,
          })
        : false,
  };

  const rest = conversations.filter((conversation) => conversation.id !== row.id);
  const items = sortConversations([updatedItem, ...rest], "latest");

  return { items, found: true, updatedItem };
}

export function prependConversationListItem(
  conversations: ConversationListItem[],
  item: ConversationListItem,
): ConversationListItem[] {
  const rest = conversations.filter((conversation) => conversation.id !== item.id);
  return sortConversations([item, ...rest], "latest");
}

export function syncNeedsAttentionList(
  needsAttention: ConversationListItem[],
  updatedItem: ConversationListItem | null,
): ConversationListItem[] {
  if (!updatedItem) {
    return needsAttention;
  }

  const without = needsAttention.filter(
    (conversation) => conversation.id !== updatedItem.id,
  );

  if (!isConversationNeedsAttention(updatedItem)) {
    return without;
  }

  return sortConversations([updatedItem, ...without], "latest").slice(0, 8);
}
