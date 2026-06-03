import { z } from "zod";

import type { IntegrationChannelId } from "@/features/integrations";
import type { MessageSenderType } from "./database.types";

export type MessagingChannel = IntegrationChannelId;

export const AI_LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Russian", label: "Русский" },
  { value: "Uzbek", label: "O'zbek" },
] as const;

export const saveChannelAiSettingsSchema = z.object({
  channel: z.enum(["whatsapp", "instagram", "telegram"]),
  aiEnabled: z.boolean(),
  language: z.string().trim().min(1, "Language is required.").max(32),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Instructions must be at least 20 characters.")
    .max(4000, "Instructions are too long."),
});

export const testChannelAiReplySchema = z.object({
  channel: z.enum(["whatsapp", "instagram", "telegram"]),
  testMessage: z
    .string()
    .trim()
    .min(1, "Enter a sample customer message.")
    .max(2000, "Message is too long."),
});

export type SaveChannelAiSettingsInput = z.infer<typeof saveChannelAiSettingsSchema>;
export type TestChannelAiReplyInput = z.infer<typeof testChannelAiReplySchema>;

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
  systemPrompt: string;
  isConfigured: boolean;
  geminiConfigured: boolean;
};

export type ChannelAnalyticsActivityPoint = {
  label: string;
  value: number;
};

export type ChannelRecentMessage = {
  id: string;
  preview: string;
  senderType: MessageSenderType;
  createdAt: string;
  contactName: string;
};

export type ChannelAnalyticsData = {
  hasBusiness: boolean;
  channel: MessagingChannel;
  totalMessages: number;
  totalContacts: number;
  aiReplies: number;
  manualReplies: number;
  activeConversations: number;
  conversionRate: number;
  activity: ChannelAnalyticsActivityPoint[];
  recentMessages: ChannelRecentMessage[];
};

export type ChannelWorkspaceSummary = {
  contactsCount: number;
  aiEnabled: boolean;
  totalMessages: number;
};
