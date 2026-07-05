import { z } from "zod";

import { PIPELINE_STAGES } from "@/types/contact.types";

export const executorContactUpdatesSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    email: z.string().trim().max(320).optional(),
    phone: z.string().trim().max(40).optional(),
    company: z.string().trim().max(200).optional(),
    location: z.string().trim().max(200).optional(),
    pipelineStage: z.enum(PIPELINE_STAGES).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    dealValue: z.number().min(0).max(999999999).optional(),
    expectedCloseDate: z.string().trim().max(32).optional(),
  })
  .strict();

export const executorCreateContactActionSchema = z.object({
  type: z.literal("create_contact"),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(320).optional(),
  company: z.string().trim().max(200).optional(),
  pipelineStage: z.enum(PIPELINE_STAGES).optional(),
});

export const executorCreateTaskActionSchema = z.object({
  type: z.literal("create_task"),
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().trim().max(40).optional(),
});

export const executorCreateDealActionSchema = z.object({
  type: z.literal("create_deal"),
  title: z.string().trim().min(1).max(200),
  value: z.number().min(0).max(999999999).optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const executorAddNoteActionSchema = z.object({
  type: z.literal("add_note"),
  content: z.string().trim().min(1).max(2000),
});

export const executorAddInternalNoteActionSchema = z.object({
  type: z.literal("add_internal_note"),
  content: z.string().trim().min(1).max(2000),
});

export const executorCreateCalendarEventActionSchema = z.object({
  type: z.literal("create_calendar_event"),
  summary: z.string().trim().min(1).max(200),
  startDateTime: z.string().trim().min(1).max(80),
  endDateTime: z.string().trim().min(1).max(80),
  timeZone: z.string().trim().min(1).max(80).default("UTC"),
  description: z.string().trim().max(2000).optional(),
  resourceName: z.string().trim().max(120).optional(),
  resourceId: z.string().uuid().optional(),
  bookingPageId: z.string().uuid().optional(),
  formAnswers: z.record(z.string(), z.string()).optional(),
});

export const executorActionSchema = z.discriminatedUnion("type", [
  executorCreateContactActionSchema,
  executorCreateTaskActionSchema,
  executorCreateDealActionSchema,
  executorAddNoteActionSchema,
  executorAddInternalNoteActionSchema,
  executorCreateCalendarEventActionSchema,
]);

export const executorPlanSchema = z.object({
  contactUpdates: executorContactUpdatesSchema.optional(),
  actions: z.array(executorActionSchema).max(5).default([]),
  clientSummary: z.string().trim().max(500).optional(),
});

export type ExecutorContactUpdates = z.infer<typeof executorContactUpdatesSchema>;
export type ExecutorAction = z.infer<typeof executorActionSchema>;
export type ExecutorPlan = z.infer<typeof executorPlanSchema>;

export type AgentExecutorResult = {
  success: boolean;
  actionsApplied: string[];
  skippedDuplicates: string[];
  clientSummary: string;
  rawPlan: ExecutorPlan | null;
  errorMessage?: string;
  planDuplicateSkipped?: boolean;
};
