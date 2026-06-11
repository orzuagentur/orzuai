import type { MessageSenderType } from "@/types/database.types";
import { getMessagePreviewText } from "@/utils/chat-media";

export type ConversationLastMessageFields = {
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_type: MessageSenderType | null;
  last_message_ai_generated: boolean;
  last_client_message_at: string | null;
};

export function buildConversationLastMessageUpdate(input: {
  content: string;
  senderType: MessageSenderType;
  aiGenerated?: boolean;
  createdAt: string;
  previousLastClientMessageAt?: string | null;
}): ConversationLastMessageFields & { updated_at: string } {
  const preview = getMessagePreviewText(input.content);

  return {
    last_message_preview: preview,
    last_message_at: input.createdAt,
    last_message_sender_type: input.senderType,
    last_message_ai_generated: input.aiGenerated ?? false,
    last_client_message_at:
      input.senderType === "client"
        ? input.createdAt
        : (input.previousLastClientMessageAt ?? null),
    updated_at: input.createdAt,
  };
}

export function resolveDenormalizedLastMessage(row: {
  last_message_preview?: string | null;
  last_message_at?: string | null;
  last_message_sender_type?: MessageSenderType | null;
  last_message_ai_generated?: boolean | null;
}):
  | {
      preview: string;
      createdAt: string;
      senderType: MessageSenderType;
      aiGenerated: boolean;
    }
  | undefined {
  if (!row.last_message_at || !row.last_message_sender_type) {
    return undefined;
  }

  return {
    preview: row.last_message_preview ?? "",
    createdAt: row.last_message_at,
    senderType: row.last_message_sender_type,
    aiGenerated: row.last_message_ai_generated ?? false,
  };
}
