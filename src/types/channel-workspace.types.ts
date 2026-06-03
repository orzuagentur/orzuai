import { z } from "zod";

import { GEMINI_MODEL_IDS } from "@/lib/gemini/constants";
import type { IntegrationChannelId } from "@/features/integrations";
import type { IntegrationChannelStatusMap } from "@/features/integrations/channel-status";
import type { MessageSenderType } from "./database.types";

export type MessagingChannel = IntegrationChannelId;

export const AI_LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Russian", label: "Русский" },
  { value: "Uzbek", label: "O'zbek" },
] as const;

const geminiModelSchema = z.enum(GEMINI_MODEL_IDS, {
  message: "Select a valid Gemini model.",
});

export const saveChannelAiSettingsSchema = z.object({
  channel: z.enum(["whatsapp", "instagram", "telegram", "website_forms"]),
  aiEnabled: z.boolean(),
  model: geminiModelSchema,
  language: z.string().trim().min(1, "Language is required.").max(32),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Instructions must be at least 20 characters.")
    .max(4000, "Instructions are too long."),
});

export const applyGlobalAiDefaultsSchema = z.object({
  model: geminiModelSchema,
  language: z.string().trim().min(1).max(32),
  systemPrompt: z.string().trim().min(20).max(4000),
  applyAiEnabled: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
});

export type ApplyGlobalAiDefaultsInput = z.infer<typeof applyGlobalAiDefaultsSchema>;

export const testChannelAiReplySchema = z.object({
  channel: z.enum(["whatsapp", "instagram", "telegram", "website_forms"]),
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
  isChannelConnected: boolean;
  defaultModel: string;
};

export type AiAssistantChannelEntry = {
  channel: MessagingChannel;
  settings: ChannelAiSettingsData;
};

export type AiAssistantPageData = {
  hasBusiness: boolean;
  geminiConfigured: boolean;
  defaultModel: string;
  activeChannel: MessagingChannel;
  channelStatuses: IntegrationChannelStatusMap;
  channels: AiAssistantChannelEntry[];
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
