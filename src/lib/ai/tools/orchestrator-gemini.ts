import {
  FunctionCallingMode,
  SchemaType,
  type FunctionDeclaration,
  type Schema,
  type Tool,
} from "@google/generative-ai";

import { AGENT_TOOL_NAMES } from "@/lib/ai/tools/registry";
import { PIPELINE_STAGES } from "@/types/contact.types";
import { CUSTOMER_INTENTS } from "@/types/intent-router.types";

export const ORCHESTRATOR_PLAN_TOOL_NAME = "plan_orchestration";

const ACTION_TYPE_ENUM = [...AGENT_TOOL_NAMES] as string[];
const INTENT_ENUM = [...CUSTOMER_INTENTS] as string[];
const PIPELINE_ENUM = [...PIPELINE_STAGES] as string[];

/** Flat action shape for Gemini function calling (validated later with Zod). */
const orchestratorActionProperties: { [k: string]: Schema } = {
  type: {
    type: SchemaType.STRING,
    format: "enum",
    enum: ACTION_TYPE_ENUM,
    description: "CRM/calendar action type to execute.",
  },
  name: {
    type: SchemaType.STRING,
    description: "Contact name for create_contact.",
  },
  phone: {
    type: SchemaType.STRING,
    description: "Phone for create_contact or contactUpdates.",
  },
  email: {
    type: SchemaType.STRING,
    description: "Email for create_contact or contactUpdates.",
  },
  company: {
    type: SchemaType.STRING,
    description: "Company name when stated by the customer.",
  },
  title: {
    type: SchemaType.STRING,
    description: "Title for create_task or create_deal.",
  },
  dueAt: {
    type: SchemaType.STRING,
    description: "ISO due date/time for create_task.",
  },
  value: {
    type: SchemaType.NUMBER,
    description: "Deal value for create_deal.",
  },
  stage: {
    type: SchemaType.STRING,
    format: "enum",
    enum: PIPELINE_ENUM,
    description: "Pipeline stage for create_deal or create_contact.",
  },
  notes: {
    type: SchemaType.STRING,
    description: "Optional deal notes.",
  },
  content: {
    type: SchemaType.STRING,
    description: "Note body for add_note or add_internal_note.",
  },
  summary: {
    type: SchemaType.STRING,
    description: "Calendar event summary.",
  },
  startDateTime: {
    type: SchemaType.STRING,
    description: "ISO start for create_calendar_event.",
  },
  endDateTime: {
    type: SchemaType.STRING,
    description: "ISO end for create_calendar_event.",
  },
  timeZone: {
    type: SchemaType.STRING,
    description: "IANA timezone for create_calendar_event.",
  },
  description: {
    type: SchemaType.STRING,
    description: "Calendar event description.",
  },
  resourceName: {
    type: SchemaType.STRING,
    description: "Bookable resource name when known.",
  },
  resourceId: {
    type: SchemaType.STRING,
    description: "Bookable resource UUID when known.",
  },
  bookingPageId: {
    type: SchemaType.STRING,
    description: "Booking page UUID when known.",
  },
  pipelineStage: {
    type: SchemaType.STRING,
    format: "enum",
    enum: PIPELINE_ENUM,
    description: "Pipeline stage for create_contact.",
  },
};

export const ORCHESTRATOR_PLAN_FUNCTION: FunctionDeclaration = {
  name: ORCHESTRATOR_PLAN_TOOL_NAME,
  description:
    "Plan CRM routing and actions for a customer message. Always call this tool once with the full plan. Never invent contact details.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      intent: {
        type: SchemaType.STRING,
        format: "enum",
        enum: INTENT_ENUM,
        description: "Primary customer intent.",
      },
      confidence: {
        type: SchemaType.NUMBER,
        description: "Confidence from 0 to 1.",
      },
      managerAlert: {
        type: SchemaType.BOOLEAN,
        description:
          "Silent owner alert for abuse, legal risk, or unsafe situations. Do not mention to the customer.",
      },
      handoffConfirmed: {
        type: SchemaType.BOOLEAN,
        description:
          "True only when the customer clearly agreed to speak with a human.",
      },
      humanReason: {
        type: SchemaType.STRING,
        description: "Short internal reason for the owner notification.",
      },
      clientSummary: {
        type: SchemaType.STRING,
        description:
          "Customer-facing confirmation of completed outcomes. Leave empty when unused.",
      },
      contactUpdates: {
        type: SchemaType.OBJECT,
        description: "Contact field updates only when clearly stated.",
        properties: {
          name: { type: SchemaType.STRING },
          email: { type: SchemaType.STRING },
          phone: { type: SchemaType.STRING },
          company: { type: SchemaType.STRING },
          location: { type: SchemaType.STRING },
          pipelineStage: {
            type: SchemaType.STRING,
            format: "enum",
            enum: PIPELINE_ENUM,
          },
          tags: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          dealValue: { type: SchemaType.NUMBER },
          expectedCloseDate: { type: SchemaType.STRING },
        },
      },
      actions: {
        type: SchemaType.ARRAY,
        description: "Up to 5 concrete CRM/calendar actions.",
        items: {
          type: SchemaType.OBJECT,
          properties: orchestratorActionProperties,
          required: ["type"],
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
  },
};

export const ORCHESTRATOR_GEMINI_TOOLS: Tool[] = [
  { functionDeclarations: [ORCHESTRATOR_PLAN_FUNCTION] },
];

export const ORCHESTRATOR_GEMINI_TOOL_CONFIG = {
  functionCallingConfig: {
    mode: FunctionCallingMode.ANY,
    allowedFunctionNames: [ORCHESTRATOR_PLAN_TOOL_NAME] as string[],
  },
};

export function extractOrchestratorToolArgs(
  response: {
    functionCalls?: () => Array<{ name: string; args: object }> | undefined;
  },
): unknown | null {
  const calls = response.functionCalls?.() ?? [];
  const planCall = calls.find(
    (call) => call.name === ORCHESTRATOR_PLAN_TOOL_NAME,
  );

  if (!planCall) {
    return null;
  }

  return planCall.args;
}
