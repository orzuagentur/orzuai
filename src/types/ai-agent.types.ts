import { z } from "zod";

import {
  AGENT_ICON_IDS,
  DEFAULT_AGENT_ICON,
  type AgentIconId,
} from "@/features/ai-assistant/agent-icons";
import type { CommunicationStyleId } from "@/features/ai-assistant/communication-styles";
import { AI_PROVIDERS } from "@/lib/ai/constants";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { MessagingChannel } from "./database.types";

const communicationStyleSchema = z.enum([
  "professional",
  "friendly",
  "concise",
  "empathetic",
] satisfies [CommunicationStyleId, ...CommunicationStyleId[]]);

const messagingChannelSchema = z.enum([
  MESSAGING_INTEGRATION_CHANNELS[0],
  ...MESSAGING_INTEGRATION_CHANNELS.slice(1),
]);

export const createAiAgentSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  systemPrompt: z
    .string()
    .trim()
    .min(20, "Instructions must be at least 20 characters.")
    .max(4000),
  channels: z.array(messagingChannelSchema).min(1, "Select at least one channel."),
  triggerKeywords: z.array(z.string().trim().min(1).max(40)).max(20),
  enabled: z.boolean().default(true),
  provider: z.enum(AI_PROVIDERS).default("gemini"),
  model: z.string().trim().min(1).max(100),
  language: z.string().trim().min(1).max(32),
  communicationStyle: communicationStyleSchema.default("professional"),
  icon: z.enum(AGENT_ICON_IDS).default(DEFAULT_AGENT_ICON),
  useCustomModel: z.boolean().default(false),
});

export const updateAiAgentSchema = createAiAgentSchema.extend({
  id: z.string().uuid(),
});

export const deleteAiAgentSchema = z.object({
  id: z.string().uuid(),
});

export type CreateAiAgentInput = z.infer<typeof createAiAgentSchema>;
export type UpdateAiAgentInput = z.infer<typeof updateAiAgentSchema>;
export type DeleteAiAgentInput = z.infer<typeof deleteAiAgentSchema>;

export type AiAgentItem = {
  id: string;
  name: string;
  systemPrompt: string;
  channels: MessagingIntegrationChannelId[];
  triggerKeywords: string[];
  enabled: boolean;
  provider: string;
  model: string;
  language: string;
  communicationStyle: string;
  icon: AgentIconId;
  useCustomModel: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiAgentChannelAnalytics = {
  channel: MessagingChannel;
  contactsServed: number;
  aiReplies: number;
  conversationsHandled: number;
};

export type AiAgentDailyReplyPoint = {
  date: string;
  count: number;
};

export type AiAgentAnalytics = {
  agentId: string;
  contactsServed: number;
  conversationsHandled: number;
  totalAiReplies: number;
  aiRepliesLast7Days: number;
  aiRepliesLast30Days: number;
  clientMessagesInHandledConversations: number;
  humanRepliesAfterAgent: number;
  avgRepliesPerContact: number;
  avgRepliesPerConversation: number;
  lastReplyAt: string | null;
  firstReplyAt: string | null;
  trackingSince: string | null;
  channelBreakdown: AiAgentChannelAnalytics[];
  dailyReplies: AiAgentDailyReplyPoint[];
};

export type AiAgentActionResult =
  | { success: true; id?: string }
  | { success: false; error: { code: string; message: string } };
