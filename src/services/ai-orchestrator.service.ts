import "server-only";

import { generateTextWithFallback } from "@/services/llm.service";
import type { ContactSnapshot } from "@/services/agent-task-executor.service";
import {
  orchestratorResponseSchema,
  type OrchestratorResponse,
} from "@/types/ai-orchestrator.types";

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type OrchestratorFailureCode =
  | "llm_failed"
  | "invalid_json"
  | "validation_failed";

export type OrchestratorRunResult =
  | { success: true; data: OrchestratorResponse; usedProvider?: string }
  | {
      success: false;
      errorCode: OrchestratorFailureCode;
      errorMessage: string;
      rawText?: string;
      attemptedProviders?: string[];
    };

function parseJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);

    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function buildOrchestratorPrompt(input: {
  message: string;
  conversationHistory: ConversationTurn[];
  contact: ContactSnapshot | null;
  calendarConnected: boolean;
  bookableResourcesText?: string;
  availabilityText?: string;
}): string {
  const historySection =
    input.conversationHistory.length > 0
      ? input.conversationHistory
          .slice(-8)
          .map(
            (turn) =>
              `${turn.role === "user" ? "Customer" : "Assistant"}: ${turn.content}`,
          )
          .join("\n")
      : "No prior messages.";

  const contactSection = input.contact
    ? JSON.stringify(
        {
          name: input.contact.name,
          phone: input.contact.phoneNumber,
          alternatePhones:
            input.contact.customFields.additionalContacts
              ?.filter((entry) => entry.type === "phone")
              .map((entry) => entry.value) ?? [],
          email: input.contact.email,
          company: input.contact.customFields.company ?? null,
          location: input.contact.customFields.location ?? null,
          pipelineStage: input.contact.pipelineStage,
          dealValue: input.contact.dealValue,
          tags: input.contact.tags,
        },
        null,
        2,
      )
    : null;

  return [
    "Analyze the customer's latest message for agent routing and CRM actions.",
    "",
    "Recent conversation:",
    historySection,
    "",
    "Latest customer message:",
    input.message,
    "",
    contactSection
      ? ["Current CRM contact:", contactSection, ""].join("\n")
      : "No CRM contact linked to this conversation — return empty actions.",
    "",
    input.calendarConnected
      ? "Google Calendar is connected with live availability. For booking intent: if the customer asks what times are free, use clientSummary to offer slots from the availability list below. If they give a date/time, use create_calendar_event only when it matches a free slot or is very close; include resourceName when relevant."
      : "Google Calendar is NOT connected. For booking intent, create_task with requested time in dueAt and leave clientSummary telling the customer they are saved in the system and a manager will confirm the appointment.",
    "",
    input.availabilityText?.trim()
      ? [input.availabilityText.trim(), ""].join("\n")
      : "",
    input.bookableResourcesText?.trim()
      ? [
          "Bookable resources configured for this business:",
          input.bookableResourcesText.trim(),
          "When creating create_calendar_event, set resourceName to the exact resource name when booking a room/table/master/bay. Include resource in summary (e.g. Room 101 — Guest Name).",
          "",
        ].join("\n")
      : "",
    "Return JSON only with this shape:",
    '{"intent":"general|booking|sales|support|registration|none","confidence":0.0,"managerAlert":false,"handoffConfirmed":false,"humanReason":"","contactUpdates":{},"actions":[],"clientSummary":""}',
    "",
    "Intent guide:",
    "- general: greetings, small talk, unclear intent",
    "- booking: schedule, appointment, reservation, visit time",
    "- sales: pricing, purchase, demo, product interest",
    "- support: help, issue, complaint, how-to",
    "- registration: sign up, enroll, create account, onboarding",
    "- none: spam or not actionable",
    "",
    "Manager escalation (owner is notified in the background — never mention this to the customer):",
    "- managerAlert true: suspicious, abusive, legal threat, very angry, sensitive, or outside what AI can safely handle. The conversational agent keeps helping the customer.",
    "- handoffConfirmed true ONLY when the customer clearly agreed to speak with a human (said yes after being asked, or explicitly insisted connect me to a manager now).",
    "- If the customer asks for a manager/person but has NOT confirmed yet: managerAlert false, handoffConfirmed false. Use add_internal_note if useful. The chat agent should ask one short confirmation question.",
    "- humanReason: one short sentence for the owner notification only (never copy to clientSummary).",
    "- Prefer solving the request yourself. Escalation is a last resort.",
    "",
    "CRM rules (only when contact is present):",
    "- booking intent: when the customer gives a clear date/time and Google Calendar is connected, prefer create_calendar_event plus add_note; use only times that fit live availability when provided",
    "- booking intent when customer asks for open times: answer in clientSummary using the availability list; do not invent slots",
    "- booking intent without calendar or uncertain time: create_task for manager follow-up; clientSummary may tell the customer they are queued and the team will confirm",
    "- booking/support intent: prefer create_task and add_note when a real calendar event is not certain",
    "- sales intent: prefer create_deal, create_task, add_note",
    "- general/none: add_note, add_internal_note, and contactUpdates only when customer shares new details",
    "- add_internal_note: team-only context for managers (not sent to customer). Use for impatience, owner requests, or internal observations.",
    "- Do not invent contact data. Omit uncertain fields.",
    "- create_calendar_event requires summary, startDateTime, endDateTime, timeZone, optional description, optional resourceName. Use ISO date-times.",
    "- clientSummary: optional one short sentence spoken DIRECTLY to the customer (use I/we). Never mention managers, escalation, transfers, CRM, systems, or internal notes. Never describe the customer in third person. Leave empty when the main reply already covers it or when only a silent manager alert is needed.",
  ].join("\n");
}

async function requestOrchestratorJson(input: {
  businessId: string;
  message: string;
  conversationHistory: ConversationTurn[];
  contact: ContactSnapshot | null;
  calendarConnected: boolean;
  bookableResourcesText?: string;
  availabilityText?: string;
}): Promise<
  | { success: true; text: string; usedProvider?: string }
  | { success: false; errorMessage: string; attemptedProviders: string[] }
> {
  const prompt = buildOrchestratorPrompt(input);

  const result = await generateTextWithFallback({
    businessId: input.businessId,
    callType: "orchestrator",
    preferredProvider: "gemini",
    systemInstruction:
      "You route customer messages and plan CRM updates for a business inbox. Reply with valid JSON only. confidence is 0 to 1. Never invent contact details. Use managerAlert for silent owner alerts; use handoffConfirmed only when the customer clearly wants a human.",
    prompt,
  });

  if (!result.success) {
    return {
      success: false,
      errorMessage: result.error.message,
      attemptedProviders: result.attemptedProviders,
    };
  }

  return {
    success: true,
    text: result.data.text,
    usedProvider: result.usedProvider,
  };
}

function validateOrchestratorResponse(
  rawText: string,
): OrchestratorRunResult | null {
  const parsed = parseJsonObject(rawText);

  if (!parsed) {
    return {
      success: false,
      errorCode: "invalid_json",
      errorMessage: "Orchestrator returned invalid JSON.",
      rawText: rawText.slice(0, 500),
    };
  }

  const validated = orchestratorResponseSchema.safeParse(parsed);

  if (!validated.success) {
    return {
      success: false,
      errorCode: "validation_failed",
      errorMessage: "Orchestrator JSON failed schema validation.",
      rawText: rawText.slice(0, 500),
    };
  }

  console.info(
    "[ai-orchestrator]",
    JSON.stringify({
      intent: validated.data.intent,
      confidence: validated.data.confidence,
      managerAlert: validated.data.managerAlert,
      handoffConfirmed: validated.data.handoffConfirmed,
      actionCount: validated.data.actions.length,
      hasContactUpdates: Boolean(
        validated.data.contactUpdates &&
          Object.keys(validated.data.contactUpdates).length > 0,
      ),
    }),
  );

  return { success: true, data: validated.data };
}

export async function runAutoReplyOrchestrator(input: {
  businessId: string;
  message: string;
  conversationHistory?: ConversationTurn[];
  contact: ContactSnapshot | null;
  calendarConnected?: boolean;
  bookableResourcesText?: string;
  availabilityText?: string;
}): Promise<OrchestratorRunResult> {
  const conversationHistory = input.conversationHistory ?? [];
  const calendarConnected = input.calendarConnected ?? false;
  const bookableResourcesText = input.bookableResourcesText ?? "";
  const availabilityText = input.availabilityText ?? "";

  const firstAttempt = await requestOrchestratorJson({
    businessId: input.businessId,
    message: input.message,
    conversationHistory,
    contact: input.contact,
    calendarConnected,
    bookableResourcesText,
    availabilityText,
  });

  if (!firstAttempt.success) {
    console.warn(
      "[ai-orchestrator]",
      JSON.stringify({
        error: firstAttempt.errorMessage,
        providers: firstAttempt.attemptedProviders,
      }),
    );

    return {
      success: false,
      errorCode: "llm_failed",
      errorMessage: firstAttempt.errorMessage,
      attemptedProviders: firstAttempt.attemptedProviders,
    };
  }

  const validated = validateOrchestratorResponse(firstAttempt.text);

  if (validated?.success) {
    return {
      ...validated,
      usedProvider: firstAttempt.usedProvider,
    };
  }

  const retryAttempt = await requestOrchestratorJson({
    businessId: input.businessId,
    message: input.message,
    conversationHistory,
    contact: input.contact,
    calendarConnected,
    bookableResourcesText,
    availabilityText,
  });

  if (!retryAttempt.success) {
    return validated ?? {
      success: false,
      errorCode: "llm_failed",
      errorMessage: retryAttempt.errorMessage,
      attemptedProviders: retryAttempt.attemptedProviders,
    };
  }

  const retryValidated = validateOrchestratorResponse(retryAttempt.text);

  if (retryValidated) {
    if (retryValidated.success) {
      return {
        ...retryValidated,
        usedProvider: retryAttempt.usedProvider,
      };
    }

    return retryValidated;
  }

  return validated ?? {
    success: false,
    errorCode: "invalid_json",
    errorMessage: "Orchestrator returned invalid JSON after retry.",
    rawText: retryAttempt.text.slice(0, 500),
  };
}

/** Legacy export — response shape lives in `@/types/ai-orchestrator.types`. */
export type { OrchestratorResponse };
