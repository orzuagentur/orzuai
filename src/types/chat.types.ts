import { z } from "zod";

import type { CannedResponseItem } from "./canned-response.types";
import type {
  ConversationStatus,
  MessageSenderType,
  MessagingChannel,
} from "./database.types";

export const sendChatMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier."),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(4096, "Message is too long."),
});

const messagingChannelSchema = z.enum([
  "whatsapp",
  "instagram",
  "telegram",
  "website_forms",
]);

export const toggleChatAiSchema = z.object({
  enabled: z.boolean(),
  channel: messagingChannelSchema,
});

const conversationStatusSchema = z.enum([
  "open",
  "pending",
  "resolved",
  "snoozed",
  "active",
  "archived",
  "closed",
]);

export const updateConversationStatusSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier."),
  status: conversationStatusSchema,
});

export const updateConversationInternalNoteSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier."),
  internalNote: z.string().max(4000, "Note is too long."),
});

export const suggestConversationReplySchema = z.object({
  conversationId: z.string().uuid("Invalid conversation identifier."),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ToggleChatAiInput = z.infer<typeof toggleChatAiSchema>;
export type UpdateConversationStatusInput = z.infer<
  typeof updateConversationStatusSchema
>;
export type UpdateConversationInternalNoteInput = z.infer<
  typeof updateConversationInternalNoteSchema
>;
export type SuggestConversationReplyInput = z.infer<
  typeof suggestConversationReplySchema
>;

export type ChatMessageData = {
  id: string;
  conversationId: string;
  channel: MessagingChannel;
  senderType: MessageSenderType;
  content: string;
  aiGenerated: boolean;
  createdAt: string;
};

export type ConversationListItem = {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactIsFavorite: boolean;
  leadScore: number | null;
  channel: MessagingChannel;
  status: ConversationStatus;
  updatedAt: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastMessageSenderType: MessageSenderType | null;
  lastMessageAiGenerated: boolean;
  isUnread: boolean;
};

export type ConversationDetail = {
  id: string;
  contactId: string | null;
  contactIsFavorite: boolean;
  contactName: string;
  contactPhone: string;
  channel: MessagingChannel;
  status: ConversationStatus;
  internalNote: string | null;
  updatedAt: string;
  messages: ChatMessageData[];
};

export type ChatChannelConnectionMap = Record<MessagingChannel, boolean>;

export type ChatMonitorChannelStats = {
  channel: MessagingChannel;
  connected: boolean;
  conversationsCount: number;
  totalMessages: number;
  aiReplies: number;
  lastActivityAt: string | null;
};

export type ChatsMonitorData = {
  hasBusiness: boolean;
  channels: ChatMonitorChannelStats[];
  visibleChannelIds: MessagingChannel[];
  totalConversations: number;
  totalMessages: number;
  unifiedConversations: ConversationListItem[];
};

export type ChatsMonitorPageData = ChatsMonitorData & {
  conversations: ConversationListItem[];
  conversationsTotalCount: number;
  conversationsHasMore: boolean;
  needsAttentionConversations: ConversationListItem[];
  activeConversation: ConversationDetail | null;
  activeChannelConnected: boolean;
  activeAiEnabled: boolean | null;
  activeCannedResponses: CannedResponseItem[];
};

export type ChatsChannelPageData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  channelConnected: boolean;
  aiEnabled: boolean | null;
  conversations: ConversationListItem[];
  activeConversation: ConversationDetail | null;
  cannedResponses: CannedResponseItem[];
};

export type ChatsPageData = {
  hasBusiness: boolean;
  whatsappConnected: boolean;
  instagramConnected: boolean;
  telegramConnected: boolean;
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
export type SuggestConversationReplyResult = ChatActionResult<{ suggestion: string }>;
