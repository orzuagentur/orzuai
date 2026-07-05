import {
  executorAddInternalNoteActionSchema,
  executorAddNoteActionSchema,
  executorCreateCalendarEventActionSchema,
  executorCreateContactActionSchema,
  executorCreateDealActionSchema,
  executorCreateTaskActionSchema,
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
];

export const AGENT_TOOL_BY_NAME = new Map<AgentToolName, AgentToolDefinition>(
  AGENT_TOOLS.map((tool) => [tool.name, tool]),
);

export const AGENT_TOOL_NAMES = AGENT_TOOLS.map((tool) => tool.name);

export function getAgentTool(name: AgentToolName): AgentToolDefinition | undefined {
  return AGENT_TOOL_BY_NAME.get(name);
}
