import { z } from "zod";

import { DEAL_CURRENCIES } from "@/lib/deal-currency";
import { KNOWLEDGE_CATEGORIES } from "@/types/knowledge.types";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import { PIPELINE_STAGES } from "@/types/contact.types";

const dealCurrencyCodes = DEAL_CURRENCIES.map((entry) => entry.code) as [
  string,
  ...string[],
];

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
  "create_crm_deal",
  "create_calendar_event",
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
  "create_crm_deal",
  "create_calendar_event",
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

export const copilotCreateCrmDealActionSchema =
  copilotActionBaseSchema.extend({
    type: z.literal("create_crm_deal"),
    params: z.object({
      contactId: z.string().uuid(),
      title: z.string().trim().min(1).max(200),
      value: z.number().min(0).max(999999999).optional().nullable(),
      currency: z.enum(dealCurrencyCodes).optional(),
      stage: z.enum(PIPELINE_STAGES).optional(),
      expectedCloseDate: z.string().trim().max(32).optional().nullable(),
      notes: z.string().trim().max(2000).optional().nullable(),
      isPrimary: z.boolean().optional(),
      contactName: z.string().trim().max(200).optional(),
    }),
  });

export const copilotCreateCalendarEventActionSchema =
  copilotActionBaseSchema.extend({
    type: z.literal("create_calendar_event"),
    params: z.object({
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(10000).optional(),
      location: z.string().trim().max(500).optional(),
      startDateTime: z.string().trim().min(1).max(80),
      endDateTime: z.string().trim().min(1).max(80),
      timeZone: z.string().trim().min(1).max(80).default("UTC"),
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
  copilotCreateCrmDealActionSchema,
  copilotCreateCalendarEventActionSchema,
  copilotWebResearchActionSchema,
]);

export type CopilotProposedAction = z.infer<typeof copilotActionSchema>;

export const copilotAgentResponseSchema = z.object({
  reply: z.string().trim().min(1),
  quickReplies: z.array(z.string().trim().min(1).max(200)).max(4).optional(),
  actions: z.array(copilotActionSchema).max(6).optional(),
});

export type CopilotAgentResponse = z.infer<typeof copilotAgentResponseSchema>;
