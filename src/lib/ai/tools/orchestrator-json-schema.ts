import { AGENT_TOOL_NAMES } from "@/lib/ai/tools/registry";
import { ORCHESTRATOR_PLAN_TOOL_NAME } from "@/lib/ai/tools/orchestrator-gemini";
import { PIPELINE_STAGES } from "@/types/contact.types";
import { CUSTOMER_INTENTS } from "@/types/intent-router.types";

/** Shared JSON Schema for OpenAI tools / Claude tool_use (Zod validates later). */
export const ORCHESTRATOR_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: {
      type: "string",
      enum: [...CUSTOMER_INTENTS],
      description: "Primary customer intent.",
    },
    confidence: {
      type: "number",
      description: "Confidence from 0 to 1.",
    },
    managerAlert: {
      type: "boolean",
      description:
        "Silent owner alert for abuse, legal risk, or unsafe situations.",
    },
    handoffConfirmed: {
      type: "boolean",
      description:
        "True only when the customer clearly agreed to speak with a human.",
    },
    humanReason: {
      type: "string",
      description: "Short internal reason for the owner notification.",
    },
    clientSummary: {
      type: "string",
      description: "Customer-facing confirmation of completed outcomes.",
    },
    contactUpdates: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        location: { type: "string" },
        pipelineStage: { type: "string", enum: [...PIPELINE_STAGES] },
        tags: { type: "array", items: { type: "string" } },
        dealValue: { type: "number" },
        expectedCloseDate: { type: "string" },
      },
    },
    actions: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type"],
        properties: {
          type: { type: "string", enum: [...AGENT_TOOL_NAMES] },
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          company: { type: "string" },
          title: { type: "string" },
          dueAt: { type: "string" },
          value: { type: "number" },
          stage: { type: "string", enum: [...PIPELINE_STAGES] },
          notes: { type: "string" },
          content: { type: "string" },
          summary: { type: "string" },
          startDateTime: { type: "string" },
          endDateTime: { type: "string" },
          timeZone: { type: "string" },
          description: { type: "string" },
          resourceName: { type: "string" },
          resourceId: { type: "string" },
          bookingPageId: { type: "string" },
          pipelineStage: { type: "string", enum: [...PIPELINE_STAGES] },
          formAnswers: {
            type: "object",
            additionalProperties: { type: "string" },
            description:
              "Booking form fields as strings (guestCount, partySize, firstName, lastName, email, phone, notes, etc.).",
          },
          answers: {
            type: "object",
            additionalProperties: { type: "string" },
            description:
              "Key/value answers for update_collected_fields (data collection field keys).",
          },
          delayHours: {
            type: "number",
            description: "Hours until follow-up for schedule_follow_up (1–168).",
          },
          reason: {
            type: "string",
            description: "Reason for request_human, cancel_calendar_event, or schedule_follow_up.",
          },
          eventId: { type: "string", description: "Calendar event UUID." },
          taskId: { type: "string", description: "CRM task UUID." },
          dealId: { type: "string", description: "CRM deal UUID." },
          status: {
            type: "string",
            enum: ["open", "done"],
            description: "Task status for update_task_status.",
          },
          hoursBefore: {
            type: "number",
            description: "Hours before event for schedule_event_reminder.",
          },
          message: {
            type: "string",
            description: "Optional reminder message body.",
          },
          limit: {
            type: "number",
            description: "Max events for list_upcoming_for_contact.",
          },
        },
      },
    },
  },
  required: [
    "intent",
    "confidence",
    "managerAlert",
    "handoffConfirmed",
    "actions",
  ],
} as const;

export const ORCHESTRATOR_OPENAI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: ORCHESTRATOR_PLAN_TOOL_NAME,
      description:
        "Plan CRM routing and actions for a customer message. Always call this tool once with the full plan. Never invent contact details.",
      parameters: ORCHESTRATOR_PLAN_JSON_SCHEMA,
    },
  },
];

export const ORCHESTRATOR_OPENAI_TOOL_CHOICE = {
  type: "function" as const,
  function: { name: ORCHESTRATOR_PLAN_TOOL_NAME },
};

export const ORCHESTRATOR_CLAUDE_TOOLS = [
  {
    name: ORCHESTRATOR_PLAN_TOOL_NAME,
    description:
      "Plan CRM routing and actions for a customer message. Always call this tool once with the full plan. Never invent contact details.",
    input_schema: ORCHESTRATOR_PLAN_JSON_SCHEMA,
  },
];

export const ORCHESTRATOR_CLAUDE_TOOL_CHOICE = {
  type: "tool" as const,
  name: ORCHESTRATOR_PLAN_TOOL_NAME,
};
