import { z } from "zod";

import { KNOWLEDGE_CATEGORIES } from "@/types/knowledge.types";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";

export const PLATFORM_COPILOT_MODES = ["chat", "full_access"] as const;

export type PlatformCopilotMode = (typeof PLATFORM_COPILOT_MODES)[number];

export const COPILOT_ACTION_TYPES = [
  "navigate",
  "setup_calendar",
  "create_knowledge_entry",
  "delete_knowledge_entry",
  "delete_contact",
  "send_message",
  "toggle_channel_ai",
  "web_research_kb",
] as const;

export type CopilotActionType = (typeof COPILOT_ACTION_TYPES)[number];

export const CHAT_MODE_ACTION_TYPES = new Set<CopilotActionType>(["navigate"]);

export const FULL_ACCESS_ACTION_TYPES = new Set<CopilotActionType>([
  "setup_calendar",
  "create_knowledge_entry",
  "delete_knowledge_entry",
  "delete_contact",
  "send_message",
  "toggle_channel_ai",
  "web_research_kb",
  "navigate",
]);

const copilotActionBaseSchema = z.object({
  id: z.string().trim().min(1).max(40),
  type: z.enum(COPILOT_ACTION_TYPES),
  label: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(300),
});

export const copilotNavigateActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("navigate"),
  params: z.object({
    path: z.string().trim().min(1).max(200),
  }),
});

export const copilotSetupCalendarActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("setup_calendar"),
  params: z.object({}).optional(),
});

export const copilotCreateKnowledgeActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("create_knowledge_entry"),
  params: z.object({
    title: z.string().trim().min(2).max(200),
    content: z.string().trim().min(10).max(5000),
    category: z.enum(KNOWLEDGE_CATEGORIES),
  }),
});

export const copilotDeleteKnowledgeActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("delete_knowledge_entry"),
  params: z.object({
    entryId: z.string().uuid(),
    title: z.string().trim().optional(),
  }),
});

export const copilotDeleteContactActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("delete_contact"),
  params: z.object({
    contactId: z.string().uuid(),
    name: z.string().trim().optional(),
  }),
});

export const copilotSendMessageActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("send_message"),
  params: z.object({
    conversationId: z.string().uuid(),
    content: z.string().trim().min(1).max(4096),
    contactName: z.string().trim().optional(),
    emailSubject: z.string().trim().max(998).optional(),
  }),
});

export const copilotToggleChannelActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("toggle_channel_ai"),
  params: z.object({
    channel: z.enum(MESSAGING_INTEGRATION_CHANNELS),
    enabled: z.boolean(),
  }),
});

export const copilotWebResearchActionSchema = copilotActionBaseSchema.extend({
  type: z.literal("web_research_kb"),
  params: z.object({
    query: z.string().trim().min(2).max(200),
    businessHint: z.string().trim().max(300).optional(),
  }),
});

export const copilotActionSchema = z.discriminatedUnion("type", [
  copilotNavigateActionSchema,
  copilotSetupCalendarActionSchema,
  copilotCreateKnowledgeActionSchema,
  copilotDeleteKnowledgeActionSchema,
  copilotDeleteContactActionSchema,
  copilotSendMessageActionSchema,
  copilotToggleChannelActionSchema,
  copilotWebResearchActionSchema,
]);

export type CopilotProposedAction = z.infer<typeof copilotActionSchema>;

export const copilotAgentResponseSchema = z.object({
  reply: z.string().trim().min(1),
  quickReplies: z.array(z.string().trim().min(1).max(200)).max(4).optional(),
  actions: z.array(copilotActionSchema).max(6).optional(),
});

export type CopilotAgentResponse = z.infer<typeof copilotAgentResponseSchema>;
