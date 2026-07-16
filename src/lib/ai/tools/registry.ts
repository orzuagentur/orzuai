import {
  executorAddInternalNoteActionSchema,
  executorAddNoteActionSchema,
  executorCancelCalendarEventActionSchema,
  executorCreateCalendarEventActionSchema,
  executorCreateContactActionSchema,
  executorCreateDealActionSchema,
  executorCreateLeadActionSchema,
  executorCreateTaskActionSchema,
  executorGetBookingStatusActionSchema,
  executorListUpcomingActionSchema,
  executorRequestHumanActionSchema,
  executorRescheduleCalendarEventActionSchema,
  executorScheduleEventReminderActionSchema,
  executorScheduleFollowUpActionSchema,
  executorSendCustomerMessageActionSchema,
  executorUpdateCollectedFieldsActionSchema,
  executorUpdateDealStageActionSchema,
  executorUpdateTaskStatusActionSchema,
} from "@/types/agent-executor.types";

import type { AgentToolDefinition, AgentToolName } from "./types";

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: "create_contact",
    permission: "canUpdateContact",
    customerVisible: true,
    runsWithoutContact: true,
    description: "Create a CRM contact and link it to the conversation.",
    orchestratorHint:
      "Use when no contact exists and the customer shares name plus phone or email.",
    executorHint: "Only when conversation has no linked contact.",
    schema: executorCreateContactActionSchema,
  },
  {
    name: "create_lead",
    permission: "canUpdateContact",
    customerVisible: true,
    runsWithoutContact: true,
    description:
      "Create a new lead contact (alias of create_contact with pipeline new).",
    orchestratorHint:
      "Use for new inbound leads when capturing name/contact details for CRM.",
    executorHint: "Maps to create_contact with pipelineStage=new by default.",
    schema: executorCreateLeadActionSchema,
  },
  {
    name: "create_task",
    permission: "canCreateTask",
    customerVisible: true,
    runsWithoutContact: false,
    description: "Create an open CRM task for follow-up or callback.",
    orchestratorHint:
      "Use for follow-ups when booking is not configured or time is unknown.",
    executorHint: "Capture appointments and callbacks with a clear title.",
    schema: executorCreateTaskActionSchema,
  },
  {
    name: "create_deal",
    permission: "canCreateDeal",
    customerVisible: true,
    runsWithoutContact: false,
    description: "Create a sales deal on the contact.",
    orchestratorHint: "Use for pricing, quotes, purchase intent, or demos.",
    executorHint: "Include a specific deal title — not generic placeholders.",
    schema: executorCreateDealActionSchema,
  },
  {
    name: "add_note",
    permission: "canAddNote",
    customerVisible: false,
    runsWithoutContact: false,
    description: "Append a customer-visible note on the contact profile.",
    orchestratorHint: "Summarize new facts the customer shared.",
    executorHint: "Short factual note — visible on the contact record.",
    schema: executorAddNoteActionSchema,
  },
  {
    name: "add_internal_note",
    permission: "canAddInternalNote",
    customerVisible: false,
    runsWithoutContact: false,
    description: "Add a team-only note in the conversation sidebar.",
    orchestratorHint:
      "Internal context for owners — never copy to clientSummary.",
    executorHint: "Manager observations, impatience, or handoff context.",
    schema: executorAddInternalNoteActionSchema,
  },
  {
    name: "create_calendar_event",
    permission: "canCreateCalendarEvent",
    customerVisible: true,
    runsWithoutContact: false,
    description:
      "Book instantly via OrzuX calendar with slot resolution and email confirmation.",
    orchestratorHint:
      "Use when booking is enabled and the customer gave a usable date/time.",
    executorHint:
      "Deterministic booking: code resolves conflicts and sends confirmation email.",
    schema: executorCreateCalendarEventActionSchema,
  },
  {
    name: "list_upcoming_for_contact",
    permission: "canCreateCalendarEvent",
    customerVisible: false,
    runsWithoutContact: false,
    description: "List upcoming bookings/events for this contact.",
    orchestratorHint:
      "Use when the customer asks what is booked, scheduled, or upcoming.",
    executorHint: "Returns upcoming calendar_events matched by email/name.",
    schema: executorListUpcomingActionSchema,
  },
  {
    name: "get_booking_status",
    permission: "canCreateCalendarEvent",
    customerVisible: false,
    runsWithoutContact: false,
    description: "Get status of the next or specified booking/event.",
    orchestratorHint:
      "Use when the customer asks about booking/order/appointment status.",
    executorHint: "Looks up calendar_events by eventId or next upcoming match.",
    schema: executorGetBookingStatusActionSchema,
  },
  {
    name: "reschedule_calendar_event",
    permission: "canCreateCalendarEvent",
    customerVisible: true,
    runsWithoutContact: false,
    description: "Reschedule an existing calendar booking/event.",
    orchestratorHint:
      "Use when the customer wants to change date/time of an existing booking.",
    executorHint: "Calls updateCalendarEventForBusiness (+ Google if linked).",
    schema: executorRescheduleCalendarEventActionSchema,
  },
  {
    name: "cancel_calendar_event",
    permission: "canCreateCalendarEvent",
    customerVisible: true,
    runsWithoutContact: false,
    description: "Cancel an existing calendar booking/event.",
    orchestratorHint:
      "Use when the customer wants to cancel a booking/appointment.",
    executorHint: "Calls deleteCalendarEventForBusiness (+ Google if linked).",
    schema: executorCancelCalendarEventActionSchema,
  },
  {
    name: "schedule_event_reminder",
    permission: "canCreateCalendarEvent",
    customerVisible: false,
    runsWithoutContact: false,
    description: "Schedule a proactive reminder before an upcoming event.",
    orchestratorHint:
      "Use after booking or when the customer wants a reminder before the visit.",
    executorHint: "Writes event_reminder_jobs; cron sends the message.",
    schema: executorScheduleEventReminderActionSchema,
  },
  {
    name: "update_collected_fields",
    permission: "canUpdateContact",
    customerVisible: false,
    runsWithoutContact: false,
    description:
      "Save data-collection answers into CRM and contacts.custom_fields.collection.",
    orchestratorHint:
      "Use whenever the customer provides values for configured collection fields. Do not re-ask known fields.",
    executorHint: "Merges answers into CRM columns via crmMap + collection map.",
    schema: executorUpdateCollectedFieldsActionSchema,
  },
  {
    name: "update_task_status",
    permission: "canCreateTask",
    customerVisible: false,
    runsWithoutContact: false,
    description: "Mark a CRM task open or done.",
    orchestratorHint:
      "Use when a follow-up task should be closed or reopened.",
    executorHint: "Updates crm_tasks status by id or latest matching title.",
    schema: executorUpdateTaskStatusActionSchema,
  },
  {
    name: "update_deal_stage",
    permission: "canCreateDeal",
    customerVisible: true,
    runsWithoutContact: false,
    description: "Move a CRM deal to a new pipeline stage.",
    orchestratorHint:
      "Use when the sales stage changes (qualified, proposal, won, lost).",
    executorHint: "Updates crm_deals + syncs primary deal to contact.",
    schema: executorUpdateDealStageActionSchema,
  },
  {
    name: "schedule_follow_up",
    permission: "canCreateTask",
    customerVisible: false,
    runsWithoutContact: false,
    description: "Schedule an automatic outbound follow-up message.",
    orchestratorHint:
      "Use when the customer should be nudged later and no booking was made.",
    executorHint: "Writes follow_up_jobs with custom delayHours (default 24).",
    schema: executorScheduleFollowUpActionSchema,
  },
  {
    name: "send_customer_message",
    permission: "canSendProactiveMessage",
    customerVisible: true,
    runsWithoutContact: false,
    description:
      "Send a proactive customer message on the conversation channel.",
    orchestratorHint:
      "Use for confirmations, status answers, or reminders the customer asked for now. Do not spam.",
    executorHint: "sendChannelAutoReplyText + insertChannelMessage (ai).",
    schema: executorSendCustomerMessageActionSchema,
  },
  {
    name: "request_human",
    permission: "canRequestHuman",
    customerVisible: false,
    runsWithoutContact: false,
    description: "Escalate to a human manager after customer confirmation.",
    orchestratorHint:
      "Use only when the customer clearly wants a human, or after handoffConfirmed.",
    executorHint: "Creates ai_human_requests + owner notification.",
    schema: executorRequestHumanActionSchema,
  },
];

export const AGENT_TOOL_BY_NAME = new Map<AgentToolName, AgentToolDefinition>(
  AGENT_TOOLS.map((tool) => [tool.name, tool]),
);

export const AGENT_TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.name);

export function getAgentTool(name: AgentToolName): AgentToolDefinition | undefined {
  return AGENT_TOOL_BY_NAME.get(name);
}
