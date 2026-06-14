import { z } from "zod";

import type { CannedResponseItem } from "./canned-response.types";
import type {
  ConversationStatus,
  MessageDeliveryStatus,
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

export const deleteChatMessageSchema = z.object({
  messageId: z.string().uuid("Invalid message identifier."),
});

export const retryInboundMediaAttachmentSchema = z.object({
  messageId: z.string().uuid("Invalid message identifier."),
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
export type DeleteChatMessageInput = z.infer<typeof deleteChatMessageSchema>;
export type RetryInboundMediaAttachmentInput = z.infer<
  typeof retryInboundMediaAttachmentSchema
>;

export type ChatMessageData = {
  id: string;
  conversationId: string;
  channel: MessagingChannel;
  senderType: MessageSenderType;
  content: string;
  aiGenerated: boolean;
  createdAt: string;
  deletedForAllAt: string | null;
  hiddenForBusiness: boolean;
  editedAt: string | null;
  isEdited: boolean;
  /** Client-only optimistic outbound message before server confirms. */
  isPending?: boolean;
  /** 0–100 while optimistic media is uploading. */
  uploadProgress?: number;
  /** Bytes per second during media upload. */
  uploadSpeedBps?: number;
  /** Client-only media send phase before server confirms. */
  uploadPhase?: "preparing" | "uploading" | "completing";
  /** Outbound delivery state from message_deliveries (user messages only). */
  deliveryStatus?: MessageDeliveryStatus | null;
  /** Inbound/outbound media still hydrating in storage. */
  attachmentPending?: boolean;
  /** Inbound media hydration failed — user can retry. */
  attachmentFailed?: boolean;
};

export type ConversationListItem = {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactAvatarUrl: string | null;
  contactIsFavorite: boolean;
  leadScore: number | null;
  channel: MessagingChannel;
  status: ConversationStatus;
  updatedAt: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastMessageSenderType: MessageSenderType | null;
  lastMessageAiGenerated: boolean;
  lastClientMessageAt: string | null;
  unreadMessageCount: number;
  isUnread: boolean;
};

export type ConversationDetail = {
  id: string;
  contactId: string | null;
  contactIsFavorite: boolean;
  contactName: string;
  contactPhone: string;
  contactAvatarUrl: string | null;
  channel: MessagingChannel;
  status: ConversationStatus;
  internalNote: string | null;
  updatedAt: string;
  lastReadAt: string | null;
  messages: ChatMessageData[];
  hasOlderMessages: boolean;
  totalMessageCount: number;
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
  businessId: string | null;
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
  businessId: string | null;
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

export type SendChatMessageResult = ChatActionResult<{
  message: ChatMessageData;
  /** Present for outbound media sends — avoids a second signed-URL round trip. */
  mediaSignedUrl?: string;
}>;
export type DeleteChatMessageResult = ChatActionResult<{ messageId: string }>;
export type ToggleChatAiResult = ChatActionResult<{ aiEnabled: boolean }>;
export type SuggestConversationReplyResult = ChatActionResult<{ suggestion: string }>;
