import type { MessagingChannel } from "@/types/database.types";

export type AiHumanRequest = {
  id: string;
  businessId: string;
  conversationId: string;
  contactId: string | null;
  channel: MessagingChannel;
  contactName: string;
  reason: string;
  messagePreview: string;
  createdAt: string;
};
