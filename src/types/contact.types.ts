import { z } from "zod";

import type { CrmTaskItem } from "./crm-task.types";
import type { MessageSenderType, MessagingChannel } from "./database.types";

export type ContactCustomFields = {
  company?: string;
  notes?: string;
};

export const PIPELINE_STAGES = [
  "new",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type UnifiedContactItem = {
  id: string;
  name: string;
  identifier: string;
  email: string | null;
  tags: string[];
  customFields: ContactCustomFields;
  leadScore: number | null;
  aiSummary: string | null;
  pipelineStage: PipelineStage;
  dealValue: number | null;
  expectedCloseDate: string | null;
  channel: MessagingChannel;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type ContactActivityType = "message" | "internal_note";

export type ContactTimelineEntry = {
  id: string;
  activityType: ContactActivityType;
  content: string;
  senderType?: MessageSenderType;
  channel: MessagingChannel;
  createdAt: string;
  aiGenerated?: boolean;
};

export const updateContactSchema = z.object({
  contactId: z.string().uuid("Invalid contact identifier."),
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().max(320).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  customFields: z.object({
    company: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(2000).optional(),
  }),
  dealValue: z.number().min(0).max(999999999).optional().nullable(),
  expectedCloseDate: z.string().trim().max(32).optional().nullable(),
});

export const deleteContactSchema = z.object({
  contactId: z.string().uuid("Invalid contact identifier."),
});

export const generateContactInsightsSchema = z.object({
  contactId: z.string().uuid("Invalid contact identifier."),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type DeleteContactInput = z.infer<typeof deleteContactSchema>;
export type GenerateContactInsightsInput = z.infer<
  typeof generateContactInsightsSchema
>;

export type ContactActionResult =
  | { success: true }
  | {
      success: false;
      error: { code: string; message: string };
    };

export type GenerateContactInsightsResult =
  | {
      success: true;
      data: { leadScore: number; aiSummary: string };
    }
  | {
      success: false;
      error: { code: string; message: string };
    };

export type ContactProfileData = {
  contact: UnifiedContactItem;
  conversationId: string | null;
  timeline: ContactTimelineEntry[];
  tasks: CrmTaskItem[];
};

export const CONTACT_SEGMENTS = ["all", "hot_leads", "no_reply_48h"] as const;

export type ContactSegment = (typeof CONTACT_SEGMENTS)[number];

export const updateContactPipelineStageSchema = z.object({
  contactId: z.string().uuid("Invalid contact identifier."),
  pipelineStage: z.enum(PIPELINE_STAGES),
});

export type UpdateContactPipelineStageInput = z.infer<
  typeof updateContactPipelineStageSchema
>;

export type ContactPipelinePageData = {
  hasBusiness: boolean;
  columns: Record<PipelineStage, UnifiedContactItem[]>;
};

export type UnifiedContactsPageData = {
  hasBusiness: boolean;
  contacts: UnifiedContactItem[];
  total: number;
  activeChannelFilter: MessagingChannel | null;
  activeSegment: ContactSegment;
  activeView: "list" | "pipeline";
};
