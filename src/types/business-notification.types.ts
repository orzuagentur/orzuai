import type { MessagingChannel } from "@/types/database.types";

export type BusinessNotificationKind = "ai_action" | "human_request";

export type BusinessNotificationDetails = {
  agentName?: string;
  actions?: string[];
  reason?: string;
  messagePreview?: string;
};

export type BusinessNotification = {
  id: string;
  businessId: string;
  kind: BusinessNotificationKind;
  conversationId: string;
  contactId: string | null;
  channel: MessagingChannel;
  contactName: string;
  title: string;
  body: string;
  details: BusinessNotificationDetails;
  sourceId: string | null;
  readAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};
