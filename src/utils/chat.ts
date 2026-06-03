import type { MessageSenderType, MessagingChannel } from "@/types/database.types";
import type { ChatMessageData, ConversationListItem } from "@/types/chat.types";

type RawMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: MessageSenderType;
  content: string;
  ai_generated: boolean;
  created_at: string;
};

type RawConversationRow = {
  id: string;
  channel: MessagingChannel;
  status: ConversationListItem["status"];
  updated_at: string;
  contact:
    | { id?: string; name: string; phone_number: string }
    | Array<{ id?: string; name: string; phone_number: string }>
    | null;
};

export function mapChatMessage(row: RawMessageRow): ChatMessageData {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    channel: row.channel,
    senderType: row.sender_type,
    content: row.content,
    aiGenerated: row.ai_generated,
    createdAt: row.created_at,
  };
}

export function resolveContactFromRow(
  contact: RawConversationRow["contact"] | { id?: string; phone_number: string },
): { id?: string; name?: string; phone_number: string } | null {
  if (!contact) {
    return null;
  }

  if (Array.isArray(contact)) {
    return contact[0] ?? null;
  }

  return contact;
}

export function buildLastMessagePreviewMap(
  messages: Array<{
    conversation_id: string;
    content: string;
    created_at: string;
  }>,
): Map<string, { preview: string; createdAt: string }> {
  const map = new Map<string, { preview: string; createdAt: string }>();

  for (const message of messages) {
    if (map.has(message.conversation_id)) {
      continue;
    }

    map.set(message.conversation_id, {
      preview: truncatePreview(message.content),
      createdAt: message.created_at,
    });
  }

  return map;
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
  lastMessage: { preview: string; createdAt: string } | undefined,
): ConversationListItem | null {
  const contact = resolveContactFromRow(row.contact);

  if (!contact) {
    return null;
  }

  return {
    id: row.id,
    contactName: contact.name ?? contact.phone_number,
    contactPhone: contact.phone_number,
    channel: row.channel,
    status: row.status,
    updatedAt: row.updated_at,
    lastMessagePreview: lastMessage?.preview ?? null,
    lastMessageAt: lastMessage?.createdAt ?? null,
  };
}
