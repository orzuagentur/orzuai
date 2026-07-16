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

export const executorUpdateCollectedFieldsActionSchema = z.object({
  type: z.literal("update_collected_fields"),
  answers: z.record(z.string(), z.string()).refine(
    (value) => Object.keys(value).length > 0,
    "At least one answer is required.",
  ),
});

export const executorScheduleFollowUpActionSchema = z.object({
  type: z.literal("schedule_follow_up"),
  delayHours: z.number().min(1).max(168).optional(),
  reason: z.string().trim().max(300).optional(),
});

export const executorRequestHumanActionSchema = z.object({
  type: z.literal("request_human"),
  reason: z.string().trim().min(1).max(300),
});

export const executorCreateLeadActionSchema = z.object({
  type: z.literal("create_lead"),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(320).optional(),
  company: z.string().trim().max(200).optional(),
  pipelineStage: z.enum(PIPELINE_STAGES).optional(),
});

export const executorListUpcomingActionSchema = z.object({
  type: z.literal("list_upcoming_for_contact"),
  limit: z.number().int().min(1).max(10).optional(),
});

export const executorGetBookingStatusActionSchema = z.object({
  type: z.literal("get_booking_status"),
  eventId: z.string().uuid().optional(),
});

export const executorRescheduleCalendarEventActionSchema = z.object({
  type: z.literal("reschedule_calendar_event"),
  eventId: z.string().uuid().optional(),
  startDateTime: z.string().trim().min(1).max(80),
  endDateTime: z.string().trim().min(1).max(80),
  timeZone: z.string().trim().min(1).max(80).optional(),
  summary: z.string().trim().max(200).optional(),
});

export const executorCancelCalendarEventActionSchema = z.object({
  type: z.literal("cancel_calendar_event"),
  eventId: z.string().uuid().optional(),
  reason: z.string().trim().max(300).optional(),
});

export const executorUpdateTaskStatusActionSchema = z.object({
  type: z.literal("update_task_status"),
  taskId: z.string().uuid().optional(),
  title: z.string().trim().max(200).optional(),
  status: z.enum(["open", "done"]),
});

export const executorUpdateDealStageActionSchema = z.object({
  type: z.literal("update_deal_stage"),
  dealId: z.string().uuid().optional(),
  stage: z.enum(PIPELINE_STAGES),
  title: z.string().trim().max(200).optional(),
});

export const executorSendCustomerMessageActionSchema = z.object({
  type: z.literal("send_customer_message"),
  content: z.string().trim().min(1).max(2000),
});

export const executorScheduleEventReminderActionSchema = z.object({
  type: z.literal("schedule_event_reminder"),
  eventId: z.string().uuid().optional(),
  hoursBefore: z.number().min(1).max(168).optional(),
  message: z.string().trim().max(2000).optional(),
});

export const executorActionSchema = z.discriminatedUnion("type", [
  executorCreateContactActionSchema,
  executorCreateLeadActionSchema,
  executorCreateTaskActionSchema,
  executorCreateDealActionSchema,
  executorAddNoteActionSchema,
  executorAddInternalNoteActionSchema,
  executorCreateCalendarEventActionSchema,
  executorUpdateCollectedFieldsActionSchema,
  executorScheduleFollowUpActionSchema,
  executorRequestHumanActionSchema,
  executorListUpcomingActionSchema,
  executorGetBookingStatusActionSchema,
  executorRescheduleCalendarEventActionSchema,
  executorCancelCalendarEventActionSchema,
  executorUpdateTaskStatusActionSchema,
  executorUpdateDealStageActionSchema,
  executorSendCustomerMessageActionSchema,
  executorScheduleEventReminderActionSchema,
]);

export const executorPlanSchema = z.object({
  contactUpdates: executorContactUpdatesSchema.optional(),
  actions: z.array(executorActionSchema).max(10).default([]),
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
