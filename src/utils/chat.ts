import type { MessageSenderType, MessagingChannel } from "@/types/database.types";
import type { ChatMessageData, ConversationListItem } from "@/types/chat.types";
import { getMessagePreviewText } from "@/utils/chat-media";
import { resolveDenormalizedLastMessage } from "@/utils/conversation-last-message";
import { isConversationUnread, withConversationUnread } from "@/utils/conversation-unread";

type RawMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: MessageSenderType;
  content: string;
  email_subject?: string | null;
  ai_generated: boolean;
  deleted_for_all_at?: string | null;
  hidden_for_business?: boolean;
  edited_at?: string | null;
  is_edited?: boolean;
  created_at: string;
};

type RawConversationRow = {
  id: string;
  channel: MessagingChannel;
  status: ConversationListItem["status"];
  updated_at: string;
  last_read_at?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  last_message_sender_type?: MessageSenderType | null;
  last_message_ai_generated?: boolean | null;
  last_client_message_at?: string | null;
  contact:
    | {
        id?: string;
        name: string;
        phone_number: string;
        lead_score?: number | null;
        is_favorite?: boolean | null;
        avatar_url?: string | null;
      }
    | Array<{
        id?: string;
        name: string;
        phone_number: string;
        lead_score?: number | null;
        is_favorite?: boolean | null;
        avatar_url?: string | null;
      }>
    | null;
};

export function mapChatMessage(row: RawMessageRow): ChatMessageData {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    channel: row.channel,
    senderType: row.sender_type,
    content: row.content,
    emailSubject: row.email_subject ?? null,
    aiGenerated: row.ai_generated,
    createdAt: row.created_at,
    deletedForAllAt: row.deleted_for_all_at ?? null,
    hiddenForBusiness: row.hidden_for_business ?? false,
    editedAt: row.edited_at ?? null,
    isEdited: row.is_edited ?? false,
  };
}

export function withPendingDeliveryStatus(
  message: ChatMessageData,
): ChatMessageData {
  if (message.senderType !== "user" || message.hiddenForBusiness) {
    return message;
  }

  return {
    ...message,
    deliveryStatus: message.deliveryStatus ?? "pending",
  };
}

export function isChatMessageDeletedForAll(message: ChatMessageData): boolean {
  return Boolean(message.deletedForAllAt);
}

export function resolveContactFromRow(
  contact: RawConversationRow["contact"] | { id?: string; phone_number: string },
): {
  id?: string;
  name?: string;
  phone_number: string;
  lead_score?: number | null;
  is_favorite?: boolean | null;
  avatar_url?: string | null;
} | null {
  if (!contact) {
    return null;
  }

  if (Array.isArray(contact)) {
    return contact[0] ?? null;
  }

  return contact;
}

export function buildConversationMessageMaps(
  messages: Array<{
    conversation_id: string;
    content: string;
    created_at: string;
    sender_type: MessageSenderType;
    ai_generated: boolean;
  }>,
): {
  lastMessageByConversationId: Map<
    string,
    {
      preview: string;
      createdAt: string;
      senderType: MessageSenderType;
      aiGenerated: boolean;
    }
  >;
  lastClientMessageAtByConversationId: Map<string, string>;
} {
  const lastMessageByConversationId = new Map<
    string,
    {
      preview: string;
      createdAt: string;
      senderType: MessageSenderType;
      aiGenerated: boolean;
    }
  >();
  const lastClientMessageAtByConversationId = new Map<string, string>();

  for (const message of messages) {
    if (!lastMessageByConversationId.has(message.conversation_id)) {
      lastMessageByConversationId.set(message.conversation_id, {
        preview: truncatePreview(getMessagePreviewText(message.content)),
        createdAt: message.created_at,
        senderType: message.sender_type,
        aiGenerated: message.ai_generated,
      });
    }

    if (
      message.sender_type === "client" &&
      !lastClientMessageAtByConversationId.has(message.conversation_id)
    ) {
      lastClientMessageAtByConversationId.set(
        message.conversation_id,
        message.created_at,
      );
    }
  }

  return { lastMessageByConversationId, lastClientMessageAtByConversationId };
}

export function buildUnreadClientMessageCountMap(
  messages: Array<{
    conversation_id: string;
    created_at: string;
    sender_type: MessageSenderType;
  }>,
  lastReadAtByConversationId: Map<string, string | null>,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const message of messages) {
    if (message.sender_type !== "client") {
      continue;
    }

    const lastReadAt =
      lastReadAtByConversationId.get(message.conversation_id) ?? null;
    const isUnread =
      !lastReadAt ||
      new Date(message.created_at).getTime() > new Date(lastReadAt).getTime();

    if (!isUnread) {
      continue;
    }

    counts.set(
      message.conversation_id,
      (counts.get(message.conversation_id) ?? 0) + 1,
    );
  }

  return counts;
}

export function buildLastMessagePreviewMap(
  messages: Array<{
    conversation_id: string;
    content: string;
    created_at: string;
    sender_type: MessageSenderType;
    ai_generated: boolean;
  }>,
): Map<
  string,
  {
    preview: string;
    createdAt: string;
    senderType: MessageSenderType;
    aiGenerated: boolean;
  }
> {
  return buildConversationMessageMaps(messages).lastMessageByConversationId;
}

function truncatePreview(content: string, maxLength = 80): string {
  const trimmed = content.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function mapConversationListItem(
  row: RawConversationRow,
  lastMessage:
    | {
        preview: string;
        createdAt: string;
        senderType: MessageSenderType;
        aiGenerated: boolean;
      }
    | undefined,
  lastClientMessageAt?: string | null,
  unreadMessageCount = 0,
  contactAvatarUrl: string | null = null,
): ConversationListItem | null {
  const contact = resolveContactFromRow(row.contact);

  if (!contact) {
    return null;
  }

  const resolvedLastMessage = lastMessage ?? resolveDenormalizedLastMessage(row);
  const resolvedLastClientMessageAt =
    lastClientMessageAt ?? row.last_client_message_at ?? null;
  const resolvedUnreadMessageCount =
    unreadMessageCount > 0
      ? unreadMessageCount
      : isConversationUnread({
          lastClientMessageAt: resolvedLastClientMessageAt,
          lastReadAt: row.last_read_at ?? null,
          status: row.status,
        })
        ? 1
        : 0;

  return withConversationUnread({
    id: row.id,
    contactId: contact.id ?? "",
    contactName: contact.name ?? contact.phone_number,
    contactPhone: contact.phone_number,
    contactAvatarUrl,
    contactIsFavorite: contact.is_favorite ?? false,
    leadScore: contact.lead_score ?? null,
    channel: row.channel,
    status: row.status,
    updatedAt: row.updated_at,
    lastMessagePreview: resolvedLastMessage?.preview ?? null,
    lastMessageAt: resolvedLastMessage?.createdAt ?? null,
    lastMessageSenderType: resolvedLastMessage?.senderType ?? null,
    lastMessageAiGenerated: resolvedLastMessage?.aiGenerated ?? false,
    lastClientMessageAt: resolvedLastClientMessageAt,
    unreadMessageCount: resolvedUnreadMessageCount,
    lastReadAt: row.last_read_at ?? null,
  });
}
