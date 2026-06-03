import type { IntegrationChannelId } from "@/features/integrations";

export type MessagingChannel = IntegrationChannelId;

export type ChannelContactItem = {
  id: string;
  name: string;
  identifier: string;
  lastMessageAt: string | null;
};

export type ChannelContactsData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  contacts: ChannelContactItem[];
  total: number;
};

export type ChannelAiSettingsData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  aiEnabled: boolean;
  model: string;
  language: string;
  isConfigured: boolean;
};

export type ChannelAnalyticsData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  totalMessages: number;
  totalContacts: number;
  aiReplies: number;
  conversionRate: number;
};

export type ChannelWorkspaceSummary = {
  contactsCount: number;
  aiEnabled: boolean;
  totalMessages: number;
};
