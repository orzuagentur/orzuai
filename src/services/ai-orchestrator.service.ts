import "server-only";

import { formatOrchestratorToolCatalog } from "@/lib/ai/tools";
import { estimateTokensFromText } from "@/lib/ai/cost";
import type { AiProvider } from "@/lib/ai/constants";
import { WORKER_ORCHESTRATOR_RULES } from "@/lib/ai/worker-behavior-prompt";
import { hasClaudeEnv } from "@/services/claude.service";
import { hasGeminiEnv } from "@/lib/env";
import { hasOpenAiEnv } from "@/services/openai.service";
import { generateTextWithFallback } from "@/services/llm.service";
import { generateOrchestratorToolPlan } from "@/services/gemini.service";
import { generateOpenAiOrchestratorToolPlan } from "@/services/openai.service";
import { generateClaudeOrchestratorToolPlan } from "@/services/claude.service";
import {
  assertAiUsageAllowed,
  logAiUsage,
} from "@/services/ai-usage.service";
import { getPlatformAiFallbackProviders } from "@/services/platform-ai-config.service";
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
  collectionContext?: string;
  outputMode?: "tools" | "json";
}): string {
  const outputMode = input.outputMode ?? "json";
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
          collection: input.contact.customFields.collection ?? null,
          pipelineStage: input.contact.pipelineStage,
          dealValue: input.contact.dealValue,
          tags: input.contact.tags,
        },
        null,
        2,
      )
    : null;

  const outputInstruction =
    outputMode === "tools"
      ? [
          "Call the plan_orchestration tool once with this shape:",
          '{"intent":"general|booking|sales|support|registration|none","confidence":0.0,"managerAlert":false,"handoffConfirmed":false,"humanReason":"","contactUpdates":{},"actions":[],"clientSummary":""}',
        ].join("\n")
      : [
          "Return JSON only with this shape:",
          '{"intent":"general|booking|sales|support|registration|none","confidence":0.0,"managerAlert":false,"handoffConfirmed":false,"humanReason":"","contactUpdates":{},"actions":[],"clientSummary":""}',
        ].join("\n");

  return [
    getPlatformPromptContent("orchestrator") || WORKER_ORCHESTRATOR_RULES,
    "",
    "Critical runtime policy:",
    "- The AI is the worker. Never route normal booking/sales/support work to a manager.",
    "- If booking is enabled and the customer gave usable date/time details, plan create_calendar_event.",
    "- Do not use clientSummary to say a booking is confirmed unless create_calendar_event is planned.",
    "- Never write that a manager/staff member will check availability, confirm, contact, or answer later.",
    "- Prefer update_collected_fields when the customer provides data-collection values.",
    "- Prefer schedule_follow_up when a later nudge is useful; use request_human only after clear customer confirmation.",
    "- Prefer create_lead for new inbound lead capture (same as create_contact with pipeline new).",
    "- Prefer list_upcoming_for_contact / get_booking_status when the customer asks about bookings or order status.",
    "- Prefer reschedule_calendar_event / cancel_calendar_event for changes to existing bookings.",
    "- Prefer schedule_event_reminder after booking or when the customer wants a pre-visit reminder.",
    "- Prefer update_task_status / update_deal_stage when CRM state should change.",
    "- Prefer send_customer_message only for explicit confirmations/status the customer needs now — never spam.",
    "- Do not plan create_deal or create_calendar_event while required data-collection fields are still missing (unless the customer already gave those values in this turn via update_collected_fields).",
    "",
    "Analyze the customer's latest message for agent routing and CRM actions.",
    `Current time: ${new Date().toISOString()}`,
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
          "If the customer shares a name (and ideally phone or email), plan create_contact or create_lead with those fields.",
          "Otherwise return empty actions.",
          "",
        ].join("\n"),
    input.collectionContext?.trim()
      ? [input.collectionContext.trim(), ""].join("\n")
      : "",
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
    outputInstruction,
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
    "- If handoffConfirmed, also plan request_human with a short reason.",
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
    "- sales intent: prefer create_deal, create_task, add_note when required collection fields are complete",
    "- registration intent: create_contact/create_lead when no contact exists, plus contactUpdates.pipelineStage=new",
    "- general/none: add_note, add_internal_note, update_collected_fields, and contactUpdates only when customer shares new details",
    "- add_internal_note: team-only context for managers (not sent to customer). Use for impatience, owner requests, or internal observations.",
    "- Do not invent contact data. Omit uncertain fields.",
    "- create_calendar_event requires summary, startDateTime, endDateTime, timeZone, optional description, resourceName, bookingPageId, formAnswers (guestCount, partySize, etc.). Use ISO date-times.",
    "- clientSummary: confirm bookings directly to the customer (I/we). State exact date, time, and resource. Never mention managers, escalation, queued bookings, or internal systems. Leave empty only when the main reply already covers it.",
  ].join("\n");
}

function logOrchestratorPlan(data: OrchestratorResponse, mode: "tools" | "json") {
  console.info(
    "[ai-orchestrator]",
    JSON.stringify({
      mode,
      intent: data.intent,
      confidence: data.confidence,
      managerAlert: data.managerAlert,
      handoffConfirmed: data.handoffConfirmed,
      actionCount: data.actions.length,
      hasContactUpdates: Boolean(
        data.contactUpdates && Object.keys(data.contactUpdates).length > 0,
      ),
    }),
  );
}

function validateOrchestratorObject(
  parsed: unknown,
  mode: "tools" | "json",
  rawText?: string,
): OrchestratorRunResult {
  const validated = orchestratorResponseSchema.safeParse(parsed);

  if (!validated.success) {
    return {
      success: false,
      errorCode: "validation_failed",
      errorMessage: "Orchestrator plan failed schema validation.",
      rawText: rawText?.slice(0, 500),
    };
  }

  logOrchestratorPlan(validated.data, mode);
  return { success: true, data: validated.data };
}

function validateOrchestratorResponse(
  rawText: string,
): OrchestratorRunResult {
  const parsed = parseJsonObject(rawText);

  if (!parsed) {
    return {
      success: false,
      errorCode: "invalid_json",
      errorMessage: "Orchestrator returned invalid JSON.",
      rawText: rawText.slice(0, 500),
    };
  }

  return validateOrchestratorObject(parsed, "json", rawText);
}

async function requestOrchestratorViaTools(input: {
  businessId: string;
  message: string;
  conversationHistory: ConversationTurn[];
  contact: ContactSnapshot | null;
  calendarBookingEnabled: boolean;
  googleCalendarConnected: boolean;
  bookableResourcesText?: string;
  bookingPagesText?: string;
  availabilityText?: string;
  collectionContext?: string;
}): Promise<OrchestratorRunResult | null> {
  const providers = (await getPlatformAiFallbackProviders("orchestrator")).filter(
    (provider) => {
      if (provider === "gemini") {
        return hasGeminiEnv();
      }

      if (provider === "openai") {
        return hasOpenAiEnv();
      }

      return hasClaudeEnv();
    },
  );

  if (providers.length === 0) {
    return null;
  }

  const allowed = await assertAiUsageAllowed(input.businessId);

  if (!allowed.allowed) {
    return {
      success: false,
      errorCode: "llm_failed",
      errorMessage: allowed.message,
      attemptedProviders: providers,
    };
  }

  const prompt = buildOrchestratorPrompt({ ...input, outputMode: "tools" });
  const systemInstruction =
    "You route customer messages and plan CRM updates for a business inbox. Always call plan_orchestration once. confidence is 0 to 1. Never invent contact details. Act autonomously — never plan manager callbacks. Use managerAlert for silent owner alerts; use handoffConfirmed only when the customer clearly wants a human.";

  const attemptedProviders: AiProvider[] = [];

  for (const provider of providers) {
    attemptedProviders.push(provider);

    const result =
      provider === "openai"
        ? await generateOpenAiOrchestratorToolPlan({
            systemInstruction,
            prompt,
          })
        : provider === "claude"
          ? await generateClaudeOrchestratorToolPlan({
              systemInstruction,
              prompt,
            })
          : await generateOrchestratorToolPlan({
              systemInstruction,
              prompt,
            });

    if (!result.success) {
      console.warn(
        "[ai-orchestrator]",
        JSON.stringify({
          mode: "tools",
          provider,
          error: result.error.message,
          code: result.error.code,
        }),
      );
      continue;
    }

    const promptEstimate = estimateTokensFromText(
      `${systemInstruction}\n${prompt}`,
    );
    const outputEstimate = estimateTokensFromText(
      JSON.stringify(result.data.args),
    );
    const measuredUsage =
      provider === "openai" || provider === "claude"
        ? (result as {
            usage?: { inputTokens: number; outputTokens: number };
          }).usage
        : undefined;

    await logAiUsage({
      businessId: input.businessId,
      callType: "orchestrator",
      provider,
      model: result.data.model,
      inputTokens: measuredUsage?.inputTokens ?? promptEstimate,
      outputTokens: measuredUsage?.outputTokens ?? outputEstimate,
      billingSource: "platform",
    });

    const validated = validateOrchestratorObject(result.data.args, "tools");

    if (!validated.success) {
      console.warn(
        "[ai-orchestrator]",
        JSON.stringify({
          mode: "tools",
          provider,
          error: validated.errorMessage,
          errorCode: validated.errorCode,
        }),
      );
      continue;
    }

    return {
      ...validated,
      usedProvider: provider,
    };
  }

  console.warn(
    "[ai-orchestrator]",
    JSON.stringify({
      mode: "tools",
      error: "all_tool_providers_failed",
      attemptedProviders,
    }),
  );

  return null;
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
  collectionContext?: string;
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
  collectionContext?: string;
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

  const promptInput = {
    businessId: input.businessId,
    message: input.message,
    conversationHistory,
    contact: input.contact,
    calendarBookingEnabled,
    googleCalendarConnected,
    bookableResourcesText,
    bookingPagesText,
    availabilityText,
    collectionContext: input.collectionContext,
  };

  const toolAttempt = await requestOrchestratorViaTools(promptInput);

  if (toolAttempt?.success) {
    void touchPlatformPromptUsage(["orchestrator"]);
    return toolAttempt;
  }

  // Usage limit / hard failure from the tools path — do not burn JSON fallback quota.
  if (toolAttempt && !toolAttempt.success) {
    return toolAttempt;
  }

  const firstAttempt = await requestOrchestratorJson(promptInput);

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

  if (validated.success) {
    void touchPlatformPromptUsage(["orchestrator"]);
    return {
      ...validated,
      usedProvider: firstAttempt.usedProvider,
    };
  }

  const retryAttempt = await requestOrchestratorJson(promptInput);

  if (!retryAttempt.success) {
    return {
      success: false,
      errorCode: validated.errorCode,
      errorMessage: validated.errorMessage,
      rawText: validated.rawText,
      attemptedProviders: retryAttempt.attemptedProviders,
    };
  }

  const retryValidated = validateOrchestratorResponse(retryAttempt.text);

  if (retryValidated.success) {
    void touchPlatformPromptUsage(["orchestrator"]);
    return {
      ...retryValidated,
      usedProvider: retryAttempt.usedProvider,
    };
  }

  return {
    success: false,
    errorCode: retryValidated.errorCode,
    errorMessage: retryValidated.errorMessage,
    rawText: retryValidated.rawText ?? retryAttempt.text.slice(0, 500),
  };
}

/** Legacy export — response shape lives in `@/types/ai-orchestrator.types`. */
export type { OrchestratorResponse };
