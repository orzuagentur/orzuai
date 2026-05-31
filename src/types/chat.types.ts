import { z } from "zod";

import type { ConversationStatus, MessageSenderType } from "./database.types";

export const sendChatMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier."),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(4096, "Message is too long."),
});

export const toggleChatAiSchema = z.object({
  enabled: z.boolean(),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ToggleChatAiInput = z.infer<typeof toggleChatAiSchema>;

export type ChatMessageData = {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  content: string;
  aiGenerated: boolean;
  createdAt: string;
};

export type ConversationListItem = {
  id: string;
  contactName: string;
  contactPhone: string;
  status: ConversationStatus;
  updatedAt: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
};

export type ConversationDetail = {
  id: string;
  contactName: string;
  contactPhone: string;
  status: ConversationStatus;
  updatedAt: string;
  messages: ChatMessageData[];
};

export type ChatsPageData = {
  hasBusiness: boolean;
  whatsappConnected: boolean;
  aiEnabled: boolean | null;
  conversations: ConversationListItem[];
  activeConversation: ConversationDetail | null;
};

export type ChatErrorCode =
  | "VALIDATION_ERROR"
  | "MISSING_CONFIG"
  | "UNAUTHORIZED"
  | "NO_BUSINESS"
  | "NOT_FOUND"
  | "WHATSAPP_NOT_CONNECTED"
  | "SEND_FAILED"
  | "UPDATE_FAILED";

export type ChatActionError = {
  code: ChatErrorCode;
  message: string;
};

export type ChatActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ChatActionError };

export type SendChatMessageResult = ChatActionResult<{ message: ChatMessageData }>;
export type ToggleChatAiResult = ChatActionResult<{ aiEnabled: boolean }>;
