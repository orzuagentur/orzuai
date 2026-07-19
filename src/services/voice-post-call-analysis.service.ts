import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getVoiceRepository,
  type VoiceCallEventRow,
  type VoiceCallSessionTurn,
} from "@/repositories/voice.repository";
import {
  createAiCalendarBooking,
  formatBookingPagesForAiPrompt,
  isCalendarBookingEnabled,
} from "@/services/ai-calendar-booking.service";
import { loadContactSnapshot } from "@/services/agent-task-executor.service";
import { formatAvailabilityForAiPrompt } from "@/services/calendar-availability.service";
import { listPublishedBookingPagesForBusinessAdmin } from "@/services/booking-pages.service";
import { generateText, getProviderAvailability } from "@/services/llm.service";
import type { Json } from "@/types/database.types";
import type { ContactCustomFields } from "@/types/contact.types";

export type VoicePostCallProcessorResult =
  | { status: "completed"; message?: string; payload?: Json }
  | { status: "skipped"; message: string; payload?: Json }
  | { status: "retry"; message: string; payload?: Json };

export type VoicePostCallAnalysisContext = {
  businessId: string;
  callLogId: string;
  callSid: string | null;
  contactId: string | null;
  phoneNumber: string;
  turns: VoiceCallSessionTurn[];
  transcriptText?: string | null;
};

type SummaryPayload = {
  summary: string;
  outcome: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  actionItems: string[];
};

type ActionItemsPayload = {
  actionItems: {
    title: string;
    priority: "low" | "medium" | "high";
    owner: "operator" | "ai" | "business";
  }[];
};

type BookingIntentPayload = {
  shouldBook: boolean;
  explicitlyConfirmed: boolean;
  confidence: number;
  summary: string;
  startDateTime: string | null;
  endDateTime: string | null;
  timeZone: string | null;
  description: string | null;
  resourceName: string | null;
  bookingPageId: string | null;
  formAnswers: Record<string, string>;
};

function hasAnyLlmProvider(): boolean {
  const providers = getProviderAvailability();
  return providers.gemini || providers.openai || providers.claude;
}

function cleanJsonText(raw: string): string {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const objectMatch = withoutFence.match(/\{[\s\S]*\}/);
  return objectMatch?.[0] ?? withoutFence;
}

function parseSummaryPayload(raw: string): SummaryPayload | null {
  try {
    const parsed = JSON.parse(cleanJsonText(raw)) as Partial<SummaryPayload>;
    const summary = parsed.summary?.trim();

    if (!summary) {
      return null;
    }

    const sentiment =
      parsed.sentiment === "positive" ||
      parsed.sentiment === "neutral" ||
      parsed.sentiment === "negative"
        ? parsed.sentiment
        : null;

    return {
      summary: summary.slice(0, 2000),
      outcome: parsed.outcome?.trim().slice(0, 500) || null,
      sentiment,
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [],
    };
  } catch {
    return null;
  }
}

function parseActionItemsPayload(raw: string): ActionItemsPayload | null {
  try {
    const parsed = JSON.parse(cleanJsonText(raw)) as Partial<ActionItemsPayload>;

    if (!Array.isArray(parsed.actionItems)) {
      return null;
    }

    return {
      actionItems: parsed.actionItems
        .map((item) => ({
          title: typeof item.title === "string" ? item.title.trim() : "",
          priority:
            item.priority === "low" ||
            item.priority === "medium" ||
            item.priority === "high"
              ? item.priority
              : "medium",
          owner:
            item.owner === "operator" ||
            item.owner === "ai" ||
            item.owner === "business"
              ? item.owner
              : "operator",
        }))
        .filter((item) => item.title)
        .slice(0, 10),
    };
  } catch {
    return null;
  }
}

function parseBookingIntentPayload(raw: string): BookingIntentPayload | null {
  try {
    const parsed = JSON.parse(cleanJsonText(raw)) as Partial<BookingIntentPayload>;
    const formAnswers =
      parsed.formAnswers &&
      typeof parsed.formAnswers === "object" &&
      !Array.isArray(parsed.formAnswers)
        ? Object.fromEntries(
            Object.entries(parsed.formAnswers).filter(
              (entry): entry is [string, string] =>
                typeof entry[0] === "string" && typeof entry[1] === "string",
            ),
          )
        : {};

    return {
      shouldBook: parsed.shouldBook === true,
      explicitlyConfirmed: parsed.explicitlyConfirmed === true,
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      startDateTime:
        typeof parsed.startDateTime === "string" ? parsed.startDateTime.trim() : null,
      endDateTime:
        typeof parsed.endDateTime === "string" ? parsed.endDateTime.trim() : null,
      timeZone: typeof parsed.timeZone === "string" ? parsed.timeZone.trim() : null,
      description:
        typeof parsed.description === "string" ? parsed.description.trim() : null,
      resourceName:
        typeof parsed.resourceName === "string" ? parsed.resourceName.trim() : null,
      bookingPageId:
        typeof parsed.bookingPageId === "string" ? parsed.bookingPageId.trim() : null,
      formAnswers,
    };
  } catch {
    return null;
  }
}

function getPayloadRecord(event: VoiceCallEventRow | undefined): Record<string, unknown> | null {
  if (!event?.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
    return null;
  }

  return event.payload as Record<string, unknown>;
}

function getSummaryFromEvents(events: VoiceCallEventRow[]): SummaryPayload | null {
  const payload = getPayloadRecord(
    events.find((event) => event.event_type === "voice_post_call.summary.created"),
  );
  const summary = typeof payload?.summary === "string" ? payload.summary.trim() : "";

  if (!summary) {
    return null;
  }

  return {
    summary,
    outcome: typeof payload?.outcome === "string" ? payload.outcome.trim() : null,
    sentiment:
      payload?.sentiment === "positive" ||
      payload?.sentiment === "neutral" ||
      payload?.sentiment === "negative"
        ? payload.sentiment
        : null,
    actionItems: Array.isArray(payload?.actionItems)
      ? payload.actionItems
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

function getExtractedActionsFromEvents(events: VoiceCallEventRow[]): ActionItemsPayload {
  const payload = getPayloadRecord(
    events.find(
      (event) => event.event_type === "voice_post_call.action_items.extracted",
    ),
  );

  if (!Array.isArray(payload?.actionItems)) {
    return { actionItems: [] };
  }

  const actionItems: ActionItemsPayload["actionItems"] = [];

  for (const item of payload.actionItems) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";

    if (!title) {
      continue;
    }

    actionItems.push({
      title,
      priority:
        record.priority === "low" ||
        record.priority === "medium" ||
        record.priority === "high"
          ? record.priority
          : "medium",
      owner:
        record.owner === "operator" ||
        record.owner === "ai" ||
        record.owner === "business"
          ? record.owner
          : "operator",
    });
  }

  return { actionItems: actionItems.slice(0, 10) };
}

function isValidFutureIsoRange(input: {
  startDateTime: string | null;
  endDateTime: string | null;
}): boolean {
  if (!input.startDateTime || !input.endDateTime) {
    return false;
  }

  const start = new Date(input.startDateTime);
  const end = new Date(input.endDateTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  // Allow same-day stays; reject ranges that already ended.
  return end.getTime() > start.getTime() && end.getTime() > Date.now();
}

function parseContactCustomFields(value: unknown): ContactCustomFields {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    company: typeof record.company === "string" ? record.company : undefined,
    notes: typeof record.notes === "string" ? record.notes : undefined,
    location: typeof record.location === "string" ? record.location : undefined,
  };
}

function buildPostCallCrmNote(input: {
  summary: SummaryPayload | null;
  actionItems: ActionItemsPayload["actionItems"];
  callSid: string | null;
}): string {
  const lines = [
    "Post-call summary",
    input.callSid ? `Call SID: ${input.callSid}` : null,
    input.summary?.summary ? `Summary: ${input.summary.summary}` : null,
    input.summary?.outcome ? `Outcome: ${input.summary.outcome}` : null,
    input.summary?.sentiment ? `Sentiment: ${input.summary.sentiment}` : null,
    input.actionItems.length > 0
      ? `Action items: ${input.actionItems
          .map((item) => `${item.title} (${item.priority}/${item.owner})`)
          .join("; ")}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

function formatTranscript(turns: VoiceCallSessionTurn[]): string {
  return turns
    .map((turn) => `${turn.role === "assistant" ? "AI" : "Customer"}: ${turn.content}`)
    .join("\n")
    .slice(0, 12000);
}

function resolveTranscriptText(context: VoicePostCallAnalysisContext): string {
  if (context.turns.length > 0) {
    return formatTranscript(context.turns);
  }

  return context.transcriptText?.trim().slice(0, 12000) ?? "";
}

function missingTranscriptResult(): VoicePostCallProcessorResult {
  return {
    status: "skipped",
    message: "No voice session transcript is available yet.",
    payload: { reason: "transcript_missing" },
  };
}

function missingProviderResult(): VoicePostCallProcessorResult {
  return {
    status: "skipped",
    message: "No LLM provider is configured for post-call analysis.",
    payload: { reason: "llm_provider_missing" },
  };
}

export async function summarizeVoicePostCall(
  context: VoicePostCallAnalysisContext,
): Promise<VoicePostCallProcessorResult> {
  const transcript = resolveTranscriptText(context);

  if (!transcript) {
    return missingTranscriptResult();
  }

  if (!hasAnyLlmProvider()) {
    return missingProviderResult();
  }

  const result = await generateText({
    businessId: context.businessId,
    callType: "conversation_summary",
    systemInstruction:
      "You summarize customer phone calls for a CRM. Return valid JSON only.",
    prompt: [
      "Analyze this call transcript.",
      `Customer phone: ${context.phoneNumber}`,
      'Return JSON: {"summary":"2-4 sentence summary","outcome":"short outcome or null","sentiment":"positive|neutral|negative|null","actionItems":["short next action"]}',
      "",
      transcript,
    ].join("\n"),
  });

  if (!result.success) {
    return {
      status: result.error.code === "MISSING_CONFIG" ? "skipped" : "retry",
      message: result.error.message,
      payload: { reason: result.error.code },
    };
  }

  const payload = parseSummaryPayload(result.data.text);

  if (!payload) {
    return {
      status: "retry",
      message: "Post-call summary response was not valid JSON.",
      payload: { reason: "invalid_summary_json" },
    };
  }

  const repo = getVoiceRepository();
  await repo.insertCallEvent({
    businessId: context.businessId,
    callLogId: context.callLogId,
    callSid: context.callSid,
    eventType: "voice_post_call.summary.created",
    actorType: "ai",
    payload,
  });

  if (context.contactId) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("contacts")
      .update({ ai_summary: payload.summary })
      .eq("id", context.contactId)
      .eq("business_id", context.businessId);

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    status: "completed",
    message: "Post-call summary created.",
    payload,
  };
}

export async function extractVoicePostCallActionItems(
  context: VoicePostCallAnalysisContext,
): Promise<VoicePostCallProcessorResult> {
  const transcript = resolveTranscriptText(context);

  if (!transcript) {
    return missingTranscriptResult();
  }

  if (!hasAnyLlmProvider()) {
    return missingProviderResult();
  }

  const result = await generateText({
    businessId: context.businessId,
    callType: "conversation_summary",
    systemInstruction:
      "You extract follow-up actions from customer calls. Return valid JSON only.",
    prompt: [
      "Extract concrete follow-up actions from this phone call.",
      "Only include actions that are clearly supported by the transcript.",
      'Return JSON: {"actionItems":[{"title":"short action","priority":"low|medium|high","owner":"operator|ai|business"}]}',
      "",
      transcript,
    ].join("\n"),
  });

  if (!result.success) {
    return {
      status: result.error.code === "MISSING_CONFIG" ? "skipped" : "retry",
      message: result.error.message,
      payload: { reason: result.error.code },
    };
  }

  const payload = parseActionItemsPayload(result.data.text);

  if (!payload) {
    return {
      status: "retry",
      message: "Post-call action item response was not valid JSON.",
      payload: { reason: "invalid_action_items_json" },
    };
  }

  await getVoiceRepository().insertCallEvent({
    businessId: context.businessId,
    callLogId: context.callLogId,
    callSid: context.callSid,
    eventType: "voice_post_call.action_items.extracted",
    actorType: "ai",
    payload,
  });

  return {
    status: "completed",
    message: "Post-call action items extracted.",
    payload,
  };
}

export async function syncVoicePostCallToCrm(
  context: VoicePostCallAnalysisContext,
): Promise<VoicePostCallProcessorResult> {
  if (!context.contactId) {
    return {
      status: "skipped",
      message: "No CRM contact is linked to this call.",
      payload: { reason: "contact_missing" },
    };
  }

  const repo = getVoiceRepository();
  const events = await repo.listCallEvents(context.businessId, context.callLogId);

  if (
    events.some((event) => event.event_type === "voice_post_call.crm.synced")
  ) {
    return {
      status: "completed",
      message: "CRM already synced for this call.",
      payload: { reason: "already_synced" },
    };
  }

  const summary = getSummaryFromEvents(events);
  const extractedActions = getExtractedActionsFromEvents(events);
  const actionItems = [
    ...(summary?.actionItems.map((title) => ({
      title,
      priority: "medium" as const,
      owner: "operator" as const,
    })) ?? []),
    ...extractedActions.actionItems,
  ];

  if (!summary && actionItems.length === 0) {
    return {
      status: "retry",
      message: "No post-call CRM summary or actions are available yet.",
      payload: { reason: "analysis_missing" },
    };
  }

  const admin = createAdminClient();
  const { data: contact, error: contactError } = await admin
    .from("contacts")
    .select("custom_fields")
    .eq("id", context.contactId)
    .eq("business_id", context.businessId)
    .maybeSingle();

  if (contactError) {
    throw new Error(contactError.message);
  }

  if (!contact) {
    return {
      status: "skipped",
      message: "CRM contact no longer exists.",
      payload: { reason: "contact_not_found" },
    };
  }

  const note = buildPostCallCrmNote({
    summary,
    actionItems,
    callSid: context.callSid,
  });
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const customFields = parseContactCustomFields(contact.custom_fields);
  const existingNotes = customFields.notes?.trim() ?? "";
  const nextNotes = existingNotes
    ? `${existingNotes}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;

  const { error: updateError } = await admin
    .from("contacts")
    .update({
      ai_summary: summary?.summary ?? undefined,
      custom_fields: {
        ...customFields,
        notes: nextNotes.slice(0, 4000),
      } as unknown as Record<string, string>,
    })
    .eq("id", context.contactId)
    .eq("business_id", context.businessId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const createdTasks: string[] = [];
  for (const item of actionItems.slice(0, 5)) {
    const title = item.title.trim().slice(0, 200);
    if (!title) {
      continue;
    }

    const { data: existingTask } = await admin
      .from("crm_tasks")
      .select("id")
      .eq("business_id", context.businessId)
      .eq("contact_id", context.contactId)
      .ilike("title", title)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (existingTask) {
      continue;
    }

    const { error: taskError } = await admin.from("crm_tasks").insert({
      business_id: context.businessId,
      contact_id: context.contactId,
      title,
      status: "open",
      due_at: null,
    });

    if (!taskError) {
      createdTasks.push(title);
    }
  }

  // Ensure there is an open deal after a sales-oriented call outcome.
  let dealTouched: string | null = null;
  const outcome = summary?.outcome?.toLowerCase() ?? "";
  const wantsDeal =
    /\b(sale|sales|deal|quote|purchase|order|interested)\b/i.test(
      `${summary?.summary ?? ""} ${outcome}`,
    ) || actionItems.some((item) => /\b(deal|quote|sale|order)\b/i.test(item.title));

  if (wantsDeal) {
    const { data: openDeal } = await admin
      .from("crm_deals")
      .select("id, title")
      .eq("business_id", context.businessId)
      .eq("contact_id", context.contactId)
      .not("status", "eq", "lost")
      .not("status", "eq", "won")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openDeal) {
      dealTouched = `updated:${openDeal.id}`;
      await admin
        .from("crm_deals")
        .update({
          notes: note.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", openDeal.id)
        .eq("business_id", context.businessId);
    } else {
      const dealTitle =
        (summary?.summary ?? "Voice call opportunity").trim().slice(0, 200) ||
        "Voice call opportunity";
      const { data: insertedDeal, error: dealError } = await admin
        .from("crm_deals")
        .insert({
          business_id: context.businessId,
          contact_id: context.contactId,
          title: dealTitle,
          stage: "new",
          status: "open",
          notes: note.slice(0, 2000),
          is_primary: false,
        })
        .select("id")
        .maybeSingle();

      if (!dealError && insertedDeal) {
        dealTouched = `created:${insertedDeal.id}`;
      }
    }
  }

  const payload = {
    contactId: context.contactId,
    summary: summary?.summary ?? null,
    actionItems,
    createdTasks,
    dealTouched,
  };

  await repo.insertCallEvent({
    businessId: context.businessId,
    callLogId: context.callLogId,
    callSid: context.callSid,
    eventType: "voice_post_call.crm.synced",
    actorType: "system",
    payload,
  });

  return {
    status: "completed",
    message: "Post-call CRM note synced.",
    payload,
  };
}

export async function createVoicePostCallBooking(
  context: VoicePostCallAnalysisContext,
): Promise<VoicePostCallProcessorResult> {
  if (!context.contactId) {
    return {
      status: "skipped",
      message: "No CRM contact is linked to this call.",
      payload: { reason: "contact_missing" },
    };
  }

  const repo = getVoiceRepository();
  const alreadyBooked = await repo.hasBookingEventForCall({
    businessId: context.businessId,
    callLogId: context.callLogId,
    callSid: context.callSid,
  });

  if (alreadyBooked) {
    return {
      status: "completed",
      message: "Booking already created for this call.",
      payload: { reason: "already_booked" },
    };
  }

  const transcript = resolveTranscriptText(context);

  if (!transcript) {
    return missingTranscriptResult();
  }

  if (!(await isCalendarBookingEnabled(context.businessId))) {
    return {
      status: "skipped",
      message: "Calendar booking is not configured for this business.",
      payload: { reason: "booking_not_configured" },
    };
  }

  if (!hasAnyLlmProvider()) {
    return missingProviderResult();
  }

  const admin = createAdminClient();
  const contact = await loadContactSnapshot(
    admin,
    context.businessId,
    context.contactId,
  );

  if (!contact) {
    return {
      status: "skipped",
      message: "CRM contact no longer exists.",
      payload: { reason: "contact_not_found" },
    };
  }

  const [bookingPages, availabilityText] = await Promise.all([
    listPublishedBookingPagesForBusinessAdmin(context.businessId),
    formatAvailabilityForAiPrompt(context.businessId),
  ]);
  const bookingPagesText = formatBookingPagesForAiPrompt(bookingPages);
  const result = await generateText({
    businessId: context.businessId,
    callType: "conversation_summary",
    systemInstruction:
      "You extract confirmed booking intent from call transcripts. Return valid JSON only.",
    prompt: [
      `Current time (UTC): ${new Date().toISOString()}`,
      `Customer: ${contact.name}, phone ${contact.phoneNumber}, email ${contact.email ?? "none"}`,
      bookingPagesText || "No published booking pages listed.",
      availabilityText,
      "",
      "Create a booking ONLY when the customer explicitly agreed to a specific future date/time or date range.",
      "For multi-day stays: startDateTime = check-in, endDateTime = check-out — keep the FULL range, never one night only.",
      "Use the business IANA timezone. Prefer local datetime with offset.",
      "Do not infer uncertain dates. Do not book if the customer only asked for options or said maybe.",
      'Return JSON: {"shouldBook":boolean,"explicitlyConfirmed":boolean,"confidence":0-1,"summary":"short booking title","startDateTime":"ISO or null","endDateTime":"ISO or null","timeZone":"IANA timezone or null","description":"short note or null","resourceName":"resource or null","bookingPageId":"id or null","formAnswers":{"guestCount":"2"}}',
      "",
      transcript,
    ].join("\n"),
  });

  if (!result.success) {
    return {
      status: result.error.code === "MISSING_CONFIG" ? "skipped" : "retry",
      message: result.error.message,
      payload: { reason: result.error.code },
    };
  }

  const intent = parseBookingIntentPayload(result.data.text);

  if (!intent) {
    return {
      status: "retry",
      message: "Booking intent response was not valid JSON.",
      payload: { reason: "invalid_booking_json" },
    };
  }

  if (
    !intent.shouldBook ||
    !intent.explicitlyConfirmed ||
    intent.confidence < 0.85 ||
    !intent.summary ||
    !intent.timeZone ||
    !isValidFutureIsoRange(intent)
  ) {
    return {
      status: "skipped",
      message: "No confirmed future booking intent was found.",
      payload: { reason: "booking_not_confirmed", intent },
    };
  }

  const bookingResult = await createAiCalendarBooking({
    businessId: context.businessId,
    contact,
    summary: intent.summary,
    startDateTime: intent.startDateTime!,
    endDateTime: intent.endDateTime!,
    timeZone: intent.timeZone,
    description: [
      intent.description,
      `Source: voice post-call ${context.callSid ?? context.callLogId}`,
    ]
      .filter(Boolean)
      .join("\n"),
    resourceName: intent.resourceName,
    bookingPageId: intent.bookingPageId,
    formAnswers: intent.formAnswers,
    clientMessage: transcript,
    preferNearestSlot: false,
  });

  if (!bookingResult.success) {
    return {
      status: "skipped",
      message: `Booking not created: ${bookingResult.message}`,
      payload: { reason: "booking_create_failed", intent },
    };
  }

  const payload = {
    intent,
    booking: bookingResult,
    contactId: contact.id,
  };

  await repo.insertCallEvent({
    businessId: context.businessId,
    callLogId: context.callLogId,
    callSid: context.callSid,
    eventType: "voice_post_call.booking.created",
    actorType: "system",
    payload,
  });

  return {
    status: "completed",
    message: "Post-call booking created.",
    payload,
  };
}
