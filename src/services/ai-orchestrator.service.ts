import "server-only";

import { formatOrchestratorToolCatalog } from "@/lib/ai/tools";
import { WORKER_ORCHESTRATOR_RULES } from "@/lib/ai/worker-behavior-prompt";
import { generateTextWithFallback } from "@/services/llm.service";
import {
  ensurePlatformPromptsLoaded,
  getPlatformPromptContent,
  touchPlatformPromptUsage,
} from "@/services/platform-prompts.service";
import { isPlatformFeatureAllowed } from "@/services/platform-business-controls.service";
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
  calendarBookingEnabled: boolean;
  googleCalendarConnected: boolean;
  bookableResourcesText?: string;
  bookingPagesText?: string;
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
    getPlatformPromptContent("orchestrator") || WORKER_ORCHESTRATOR_RULES,
    "",
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
      : [
          "No CRM contact linked to this conversation.",
          "If the customer shares a name (and ideally phone or email), plan create_contact with those fields.",
          "Otherwise return empty actions.",
          "",
        ].join("\n"),
    "",
    input.calendarBookingEnabled
      ? [
          "OrzuX calendar booking is ENABLED — you must book instantly via create_calendar_event when the customer gives a date/time (or check-in/check-out for hotels).",
          "Never tell the customer that someone will contact them, that booking is queued, or that a manager will confirm.",
          "Fill guest name, email, phone, guestCount/partySize from contact + message. Use bookingPageId when a matching page is listed below.",
          "For hotels: startDateTime = check-in, endDateTime = check-out, include guestCount in formAnswers.",
          input.googleCalendarConnected
            ? "Google Calendar is also connected — slots include Google busy times."
            : "Google Calendar is not connected — OrzuX calendar still works for instant bookings.",
          "If the customer asks what times are free, answer in clientSummary using the availability list below.",
          "If they pick a time, use create_calendar_event immediately — the system picks the nearest free slot and sends a confirmation email when email is known.",
        ].join(" ")
      : "Calendar booking is not configured yet. For booking intent, create_task with requested time in dueAt and ask for date/time details — do NOT promise a manager callback.",
    "",
    input.availabilityText?.trim()
      ? [input.availabilityText.trim(), ""].join("\n")
      : "",
    input.bookingPagesText?.trim()
      ? [input.bookingPagesText.trim(), ""].join("\n")
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
    "Available tools:",
    formatOrchestratorToolCatalog(),
    "",
    "- booking intent: when calendar booking is enabled and the customer gives a clear date/time, ALWAYS use create_calendar_event plus add_note — book immediately, never create_task instead",
    "- booking intent when customer asks for open times: answer in clientSummary using the availability list; do not invent slots",
    "- booking intent without calendar configured: create_task only to capture the request until calendar is set up",
    "- booking/support intent: create_task and add_note only when calendar booking is not configured or time is completely unknown",
    "- sales intent: prefer create_deal, create_task, add_note",
    "- registration intent: create_contact when no contact exists, plus contactUpdates.pipelineStage=new",
    "- general/none: add_note, add_internal_note, and contactUpdates only when customer shares new details",
    "- add_internal_note: team-only context for managers (not sent to customer). Use for impatience, owner requests, or internal observations.",
    "- Do not invent contact data. Omit uncertain fields.",
    "- create_calendar_event requires summary, startDateTime, endDateTime, timeZone, optional description, resourceName, bookingPageId, formAnswers (guestCount, partySize, etc.). Use ISO date-times.",
    "- clientSummary: confirm bookings directly to the customer (I/we). State exact date, time, and resource. Never mention managers, escalation, queued bookings, or internal systems. Leave empty only when the main reply already covers it.",
  ].join("\n");
}

async function requestOrchestratorJson(input: {
  businessId: string;
  message: string;
  conversationHistory: ConversationTurn[];
  contact: ContactSnapshot | null;
  calendarBookingEnabled: boolean;
  googleCalendarConnected: boolean;
  bookableResourcesText?: string;
  bookingPagesText?: string;
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
      "You route customer messages and plan CRM updates for a business inbox. Reply with valid JSON only. confidence is 0 to 1. Never invent contact details. Act autonomously — never plan manager callbacks. Use managerAlert for silent owner alerts; use handoffConfirmed only when the customer clearly wants a human.",
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
  /** @deprecated Use calendarBookingEnabled */
  calendarConnected?: boolean;
  calendarBookingEnabled?: boolean;
  googleCalendarConnected?: boolean;
  bookableResourcesText?: string;
  bookingPagesText?: string;
  availabilityText?: string;
}): Promise<OrchestratorRunResult> {
  if (!(await isPlatformFeatureAllowed(input.businessId, "ai"))) {
    return {
      success: false,
      errorCode: "llm_failed",
      errorMessage: "AI is disabled for this business.",
      attemptedProviders: [],
    };
  }

  const conversationHistory = input.conversationHistory ?? [];
  const calendarBookingEnabled =
    input.calendarBookingEnabled ?? input.calendarConnected ?? false;
  const googleCalendarConnected = input.googleCalendarConnected ?? false;
  const bookableResourcesText = input.bookableResourcesText ?? "";
  const bookingPagesText = input.bookingPagesText ?? "";
  const availabilityText = input.availabilityText ?? "";

  await ensurePlatformPromptsLoaded();

  const firstAttempt = await requestOrchestratorJson({
    businessId: input.businessId,
    message: input.message,
    conversationHistory,
    contact: input.contact,
    calendarBookingEnabled,
    googleCalendarConnected,
    bookableResourcesText,
    bookingPagesText,
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
    void touchPlatformPromptUsage(["orchestrator"]);
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
    calendarBookingEnabled,
    googleCalendarConnected,
    bookableResourcesText,
    bookingPagesText,
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
      void touchPlatformPromptUsage(["orchestrator"]);
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
