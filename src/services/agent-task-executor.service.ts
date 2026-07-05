import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AGENT_TOOL_BY_NAME,
  AGENT_TOOL_NAMES,
  formatAllowedExecutorActionTypes,
  formatExecutorToolCatalog,
  logAgentToolAudit,
} from "@/lib/ai/tools";
import { getPlatformPromptContent } from "@/services/platform-prompts.service";
import { sanitizeCustomerFacingSummary } from "@/utils/customer-facing-agent-summary";

import type { RoutableAiAgent } from "@/utils/ai-agent-routing";
import {
  buildCrmActionIdempotencyKey,
  buildExecutorPlanIdempotencyKey,
  hasCrmIdempotencyKey,
  recordCrmIdempotencyKey,
} from "@/lib/crm/executor-idempotency";
import { formatSkippedDuplicate } from "@/lib/ai/agent-run-actions";
import { generateText } from "@/services/llm.service";
import type {
  AgentExecutorResult,
  ExecutorAction,
  ExecutorContactUpdates,
  ExecutorPlan,
} from "@/types/agent-executor.types";
import { executorPlanSchema } from "@/types/agent-executor.types";
import type { ContactCustomFields, PipelineStage } from "@/types/contact.types";
import { PIPELINE_STAGES } from "@/types/contact.types";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { AgentRoutingMethod } from "@/types/intent-router.types";
import {
  createAdditionalContactId,
  parseAdditionalContacts,
  type AdditionalContactEntry,
} from "@/utils/contact-additional-contacts";
import { createAiCalendarEventNotification } from "@/services/business-notifications.service";
import { createAiCalendarBooking } from "@/services/ai-calendar-booking.service";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { canonicalPhoneNumber, phoneDigitsOnly } from "@/utils/whatsapp";

type MessagingDbClient = SupabaseClient<Database>;

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ContactSnapshot = {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  tags: string[];
  customFields: ContactCustomFields;
  pipelineStage: PipelineStage;
  dealValue: number | null;
  expectedCloseDate: string | null;
};

const GENERIC_CONTACT_NAMES = new Set([
  "customer",
  "client",
  "guest",
  "unknown",
  "user",
  "contact",
]);

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

function parseCustomFields(value: unknown): ContactCustomFields {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  const additionalContacts = parseAdditionalContacts(record.additionalContacts);

  return {
    company:
      typeof record.company === "string" && record.company.trim()
        ? record.company.trim()
        : undefined,
    notes:
      typeof record.notes === "string" && record.notes.trim()
        ? record.notes.trim()
        : undefined,
    location:
      typeof record.location === "string" && record.location.trim()
        ? record.location.trim()
        : undefined,
    additionalContacts:
      additionalContacts.length > 0 ? additionalContacts : undefined,
  };
}

function phoneDigitsMatch(a: string, b: string): boolean {
  const left = phoneDigitsOnly(a);
  const right = phoneDigitsOnly(b);

  return Boolean(left && right && left === right);
}

function mergeAdditionalPhone(
  existing: AdditionalContactEntry[] | undefined,
  phone: string,
  label = "Alternate",
): AdditionalContactEntry[] {
  const normalized = canonicalPhoneNumber(phone) || phone.trim();
  const entries = [...(existing ?? [])];

  if (
    entries.some(
      (entry) =>
        entry.type === "phone" && phoneDigitsMatch(entry.value, normalized),
    )
  ) {
    return entries;
  }

  entries.push({
    id: createAdditionalContactId(),
    type: "phone",
    value: normalized,
    label,
  });

  return entries.slice(0, 20);
}

function isPlaceholderContactName(name: string, phoneNumber: string): boolean {
  const trimmed = name.trim().toLowerCase();

  if (!trimmed || GENERIC_CONTACT_NAMES.has(trimmed)) {
    return true;
  }

  const nameDigits = trimmed.replace(/\D/g, "");
  const phoneDigits = phoneNumber.replace(/\D/g, "");

  return Boolean(nameDigits && phoneDigits && nameDigits === phoneDigits);
}

function parsePipelineStage(value: string | null | undefined): PipelineStage {
  if (PIPELINE_STAGES.includes(value as PipelineStage)) {
    return value as PipelineStage;
  }

  return "new";
}

function mapDealStatus(stage: PipelineStage): string {
  if (stage === "won") {
    return "won";
  }

  if (stage === "lost") {
    return "lost";
  }

  return "open";
}

function getAllowedActionTypes(): Set<ExecutorAction["type"]> {
  return new Set(
    AGENT_TOOL_NAMES.filter(
      (name) => !AGENT_TOOL_BY_NAME.get(name)?.runsWithoutContact,
    ),
  );
}

const GENERIC_DEAL_TITLES = new Set([
  "deal",
  "new deal",
  "sale",
  "order",
  "quote",
  "inquiry",
]);

function buildExecutorPrompt(input: {
  contact: ContactSnapshot;
  message: string;
  conversationHistory: ConversationTurn[];
  agent: RoutableAiAgent | null;
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

  const allowed = formatAllowedExecutorActionTypes();

  return [
    "Extract customer data and plan CRM updates from the latest message.",
    input.agent
      ? `Active AI agent: ${input.agent.name}.`
      : "No specialized agent matched — only update contact profile when the customer shares new details.",
    "",
    "Current CRM contact:",
    JSON.stringify(
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
    ),
    "",
    "Recent conversation:",
    historySection,
    "",
    "Latest customer message:",
    input.message,
    "",
    `Allowed action types: ${allowed}`,
    "",
    "Tool guide:",
    formatExecutorToolCatalog(),
    "",
    "Rules:",
    getPlatformPromptContent("executor"),
    "",
    "Return JSON only:",
    '{"contactUpdates":{"name":"...","email":"...","phone":"...","company":"..."},"actions":[{"type":"create_task","title":"...","dueAt":"2025-06-03T10:00:00Z"}],"clientSummary":"..."}',
  ].join("\n");
}

export async function loadContactSnapshot(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string,
): Promise<ContactSnapshot | null> {
  const { data } = await admin
    .from("contacts")
    .select(
      "id, name, phone_number, email, tags, custom_fields, pipeline_stage, deal_value, expected_close_date",
    )
    .eq("id", contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    phoneNumber: data.phone_number,
    email: data.email,
    tags: data.tags ?? [],
    customFields: parseCustomFields(data.custom_fields),
    pipelineStage: parsePipelineStage(data.pipeline_stage),
    dealValue: data.deal_value,
    expectedCloseDate: data.expected_close_date,
  };
}

async function syncPrimaryDeal(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string,
  input: {
    dealValue: number | null;
    pipelineStage: PipelineStage;
    expectedCloseDate: string | null;
  },
): Promise<void> {
  const { data: primaryDeal } = await admin
    .from("crm_deals")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("is_primary", true)
    .maybeSingle();

  const payload = {
    value: input.dealValue,
    stage: input.pipelineStage,
    expected_close_date: input.expectedCloseDate,
    status: mapDealStatus(input.pipelineStage),
  };

  if (primaryDeal?.id) {
    await admin
      .from("crm_deals")
      .update(payload)
      .eq("id", primaryDeal.id)
      .eq("business_id", businessId);
    return;
  }

  if (input.dealValue === null && input.pipelineStage === "new") {
    return;
  }

  await admin.from("crm_deals").insert({
    business_id: businessId,
    contact_id: contactId,
    title: "Primary deal",
    is_primary: true,
    ...payload,
  });
}

async function applyContactUpdates(
  admin: MessagingDbClient,
  businessId: string,
  contact: ContactSnapshot,
  updates: ExecutorContactUpdates,
): Promise<string[]> {
  const applied: string[] = [];
  const patch: Database["public"]["Tables"]["contacts"]["Update"] = {};
  const customFields: ContactCustomFields = { ...contact.customFields };

  if (updates.name?.trim()) {
    const nextName = updates.name.trim();

    if (
      isPlaceholderContactName(contact.name, contact.phoneNumber) ||
      nextName.length > contact.name.trim().length
    ) {
      patch.name = nextName;
      applied.push(`Contact name → ${nextName}`);
    }
  }

  if (updates.email?.trim()) {
    const nextEmail = updates.email.trim();

    if (!contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      patch.email = nextEmail;
      applied.push(`Email → ${nextEmail}`);
    }
  }

  if (updates.phone?.trim()) {
    const nextPhone = updates.phone.trim();

    if (
      phoneDigitsOnly(nextPhone).length >= 7 &&
      !phoneDigitsMatch(nextPhone, contact.phoneNumber)
    ) {
      customFields.additionalContacts = mergeAdditionalPhone(
        customFields.additionalContacts ?? contact.customFields.additionalContacts,
        nextPhone,
      );
      applied.push(`Alternate phone → ${canonicalPhoneNumber(nextPhone) || nextPhone}`);
    }
  }

  if (updates.company?.trim()) {
    customFields.company = updates.company.trim();
    applied.push(`Company → ${updates.company.trim()}`);
  }

  if (updates.location?.trim()) {
    customFields.location = updates.location.trim();
    applied.push(`Location → ${updates.location.trim()}`);
  }

  if (updates.tags?.length) {
    const mergedTags = [...new Set([...contact.tags, ...updates.tags])].slice(
      0,
      20,
    );

    if (mergedTags.length > contact.tags.length) {
      patch.tags = mergedTags;
      applied.push(`Tags updated`);
    }
  }

  if (updates.pipelineStage) {
    patch.pipeline_stage = updates.pipelineStage;
    applied.push(`Pipeline → ${updates.pipelineStage}`);
  }

  if (updates.dealValue !== undefined) {
    patch.deal_value = updates.dealValue;
    applied.push(`Deal value → ${updates.dealValue}`);
  }

  if (updates.expectedCloseDate?.trim()) {
    patch.expected_close_date = updates.expectedCloseDate.trim();
    applied.push(`Expected close date saved`);
  }

  if (Object.keys(customFields).length > 0) {
    patch.custom_fields = customFields as unknown as Record<string, string>;
  }

  if (Object.keys(patch).length === 0) {
    return applied;
  }

  const { error } = await admin
    .from("contacts")
    .update(patch)
    .eq("id", contact.id)
    .eq("business_id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  if (
    updates.dealValue !== undefined ||
    updates.pipelineStage ||
    updates.expectedCloseDate
  ) {
    await syncPrimaryDeal(admin, businessId, contact.id, {
      dealValue: updates.dealValue ?? contact.dealValue,
      pipelineStage: updates.pipelineStage ?? contact.pipelineStage,
      expectedCloseDate:
        updates.expectedCloseDate?.trim() ?? contact.expectedCloseDate,
    });
  }

  return applied;
}

async function hasRecentTask(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string,
  title: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("crm_tasks")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("title", title)
    .gte("created_at", since)
    .limit(1);

  return Boolean(data?.length);
}

async function applyCreateTask(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string,
  action: Extract<ExecutorAction, { type: "create_task" }>,
  idempotencyContext: {
    conversationId?: string | null;
    clientMessage: string;
  },
): Promise<string | null> {
  const title = action.title.trim();
  const idempotencyKey = buildCrmActionIdempotencyKey({
    conversationId: idempotencyContext.conversationId,
    clientMessage: idempotencyContext.clientMessage,
    actionType: "create_task",
    actionFingerprint: title,
  });

  if (await hasCrmIdempotencyKey(admin, businessId, idempotencyKey)) {
    return null;
  }

  if (await hasRecentTask(admin, businessId, contactId, title)) {
    await recordCrmIdempotencyKey(admin, {
      businessId,
      idempotencyKey,
      actionType: "create_task",
    });
    return null;
  }

  const dueAt = action.dueAt?.trim() || null;
  const { error } = await admin.from("crm_tasks").insert({
    business_id: businessId,
    contact_id: contactId,
    title,
    due_at: dueAt,
    status: "open",
  });

  if (error) {
    throw new Error(error.message);
  }

  await recordCrmIdempotencyKey(admin, {
    businessId,
    idempotencyKey,
    actionType: "create_task",
  });

  return `Task created: ${title}`;
}

async function hasRecentDeal(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string,
  title: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("crm_deals")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("title", title)
    .gte("created_at", since)
    .limit(1);

  return Boolean(data?.length);
}

async function applyCreateDeal(
  admin: MessagingDbClient,
  businessId: string,
  contactId: string,
  action: Extract<ExecutorAction, { type: "create_deal" }>,
  idempotencyContext: {
    conversationId?: string | null;
    clientMessage: string;
  },
): Promise<string | null> {
  const title = action.title.trim();

  if (GENERIC_DEAL_TITLES.has(title.toLowerCase())) {
    return null;
  }

  const idempotencyKey = buildCrmActionIdempotencyKey({
    conversationId: idempotencyContext.conversationId,
    clientMessage: idempotencyContext.clientMessage,
    actionType: "create_deal",
    actionFingerprint: title,
  });

  if (await hasCrmIdempotencyKey(admin, businessId, idempotencyKey)) {
    return null;
  }

  if (await hasRecentDeal(admin, businessId, contactId, title)) {
    await recordCrmIdempotencyKey(admin, {
      businessId,
      idempotencyKey,
      actionType: "create_deal",
    });
    return null;
  }

  const stage = action.stage ?? "new";
  const { error } = await admin.from("crm_deals").insert({
    business_id: businessId,
    contact_id: contactId,
    title,
    value: action.value ?? null,
    stage,
    status: mapDealStatus(stage),
    notes: action.notes?.trim() || null,
    is_primary: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  await recordCrmIdempotencyKey(admin, {
    businessId,
    idempotencyKey,
    actionType: "create_deal",
  });

  return `Deal created: ${title}`;
}

async function applyAddNote(
  admin: MessagingDbClient,
  businessId: string,
  contact: ContactSnapshot,
  action: Extract<ExecutorAction, { type: "add_note" }>,
  idempotencyContext: {
    conversationId?: string | null;
    clientMessage: string;
  },
): Promise<string | null> {
  const noteLine = action.content.trim();
  const idempotencyKey = buildCrmActionIdempotencyKey({
    conversationId: idempotencyContext.conversationId,
    clientMessage: idempotencyContext.clientMessage,
    actionType: "add_note",
    actionFingerprint: noteLine,
  });

  if (await hasCrmIdempotencyKey(admin, businessId, idempotencyKey)) {
    return null;
  }

  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const existingNotes = contact.customFields.notes?.trim() ?? "";
  const nextNotes = existingNotes
    ? `${existingNotes}\n\n[${timestamp}] ${noteLine}`
    : `[${timestamp}] ${noteLine}`;

  const customFields: ContactCustomFields = {
    ...contact.customFields,
    notes: nextNotes.slice(0, 4000),
  };

  const { error } = await admin
    .from("contacts")
    .update({
      custom_fields: customFields as unknown as Record<string, string>,
    })
    .eq("id", contact.id)
    .eq("business_id", businessId);

  if (error) {
    throw new Error(error.message);
  }

  await recordCrmIdempotencyKey(admin, {
    businessId,
    idempotencyKey,
    actionType: "add_note",
  });

  return "Note saved on contact";
}

async function applyAddInternalNote(
  admin: MessagingDbClient,
  businessId: string,
  conversationId: string | null | undefined,
  action: Extract<ExecutorAction, { type: "add_internal_note" }>,
  idempotencyContext: {
    conversationId?: string | null;
    clientMessage: string;
  },
): Promise<string | null> {
  if (!conversationId) {
    return null;
  }

  const noteLine = action.content.trim();
  const idempotencyKey = buildCrmActionIdempotencyKey({
    conversationId: idempotencyContext.conversationId,
    clientMessage: idempotencyContext.clientMessage,
    actionType: "add_internal_note",
    actionFingerprint: noteLine,
  });

  if (await hasCrmIdempotencyKey(admin, businessId, idempotencyKey)) {
    return null;
  }

  await getConversationRepository(admin).appendInternalNote({
    conversationId,
    businessId,
    noteLine,
  });

  await recordCrmIdempotencyKey(admin, {
    businessId,
    idempotencyKey,
    actionType: "add_internal_note",
  });

  return "Manager note added in chat";
}

async function applyCreateCalendarEvent(
  admin: MessagingDbClient,
  businessId: string,
  contact: ContactSnapshot | null,
  action: Extract<ExecutorAction, { type: "create_calendar_event" }>,
  idempotencyContext: {
    conversationId?: string | null;
    clientMessage: string;
    channel?: MessagingChannel;
    contactId?: string;
    contactName?: string;
  },
): Promise<string | null> {
  const idempotencyKey = buildCrmActionIdempotencyKey({
    conversationId: idempotencyContext.conversationId,
    clientMessage: idempotencyContext.clientMessage,
    actionType: "create_calendar_event",
    actionFingerprint: `${action.summary}:${action.startDateTime}`,
  });

  if (await hasCrmIdempotencyKey(admin, businessId, idempotencyKey)) {
    return null;
  }

  const bookingResult = await createAiCalendarBooking({
    businessId,
    contact,
    summary: action.summary,
    startDateTime: action.startDateTime,
    endDateTime: action.endDateTime,
    timeZone: action.timeZone,
    description: action.description,
    resourceName: action.resourceName,
    resourceId: action.resourceId,
    bookingPageId: action.bookingPageId,
    formAnswers: action.formAnswers,
    clientMessage: idempotencyContext.clientMessage,
    preferNearestSlot: true,
  });

  if (!bookingResult.success) {
    await recordCrmIdempotencyKey(admin, {
      businessId,
      idempotencyKey,
      actionType: "create_calendar_event",
    });
    return `Booking not confirmed: ${bookingResult.message}`;
  }

  await recordCrmIdempotencyKey(admin, {
    businessId,
    idempotencyKey,
    actionType: "create_calendar_event",
  });

  if (
    idempotencyContext.conversationId &&
    idempotencyContext.channel
  ) {
    await createAiCalendarEventNotification({
      admin,
      businessId,
      conversationId: idempotencyContext.conversationId,
      channel: idempotencyContext.channel,
      contactId: idempotencyContext.contactId ?? null,
      contactName: idempotencyContext.contactName ?? null,
      summary: bookingResult.summary,
      startDateTime: action.startDateTime,
    });
  }

  const emailNote = bookingResult.customerEmail?.includes("@")
    ? " Confirmation email sent."
    : "";

  const resourceNote = bookingResult.resourceName
    ? ` (${bookingResult.resourceName})`
    : "";

  return bookingResult.rescheduled
    ? `Booking confirmed${resourceNote} — ${bookingResult.slotLabel} (nearest available slot).${emailNote}`
    : `Booking confirmed${resourceNote} — ${bookingResult.slotLabel}.${emailNote}`;
}

async function applyExecutorPlan(
  admin: MessagingDbClient,
  businessId: string,
  contact: ContactSnapshot,
  plan: ExecutorPlan,
  idempotencyContext: {
    conversationId?: string | null;
    clientMessage: string;
    channel?: MessagingChannel;
    contactId?: string;
    contactName?: string;
  },
): Promise<{ applied: string[]; skipped: string[] }> {
  const applied: string[] = [];
  const skipped: string[] = [];
  const allowed = getAllowedActionTypes();

  if (plan.contactUpdates && Object.keys(plan.contactUpdates).length > 0) {
    applied.push(
      ...(await applyContactUpdates(
        admin,
        businessId,
        contact,
        plan.contactUpdates,
      )),
    );
  }

  for (const action of plan.actions) {
    if (!allowed.has(action.type)) {
      continue;
    }

    let result: string | null = null;

    if (action.type === "create_task") {
      result = await applyCreateTask(
        admin,
        businessId,
        contact.id,
        action,
        idempotencyContext,
      );
    } else if (action.type === "create_deal") {
      result = await applyCreateDeal(
        admin,
        businessId,
        contact.id,
        action,
        idempotencyContext,
      );
    } else if (action.type === "add_note") {
      const refreshed = await loadContactSnapshot(admin, businessId, contact.id);
      result = await applyAddNote(
        admin,
        businessId,
        refreshed ?? contact,
        action,
        idempotencyContext,
      );
    } else if (action.type === "add_internal_note") {
      result = await applyAddInternalNote(
        admin,
        businessId,
        idempotencyContext.conversationId,
        action,
        idempotencyContext,
      );
    } else if (action.type === "create_calendar_event") {
      result = await applyCreateCalendarEvent(
        admin,
        businessId,
        contact,
        action,
        idempotencyContext,
      );
    }

    if (result) {
      applied.push(result);
      logAgentToolAudit({
        tool: action.type,
        businessId,
        conversationId: idempotencyContext.conversationId,
        contactId: contact.id,
        success: true,
        label: result,
      });
    } else {
      skipped.push(formatSkippedDuplicate(action.type));
    }
  }

  if (plan.contactUpdates && Object.keys(plan.contactUpdates).length > 0) {
    logAgentToolAudit({
      tool: "contact_updates",
      businessId,
      conversationId: idempotencyContext.conversationId,
      contactId: contact.id,
      success: true,
      label: applied.filter((entry) => entry.startsWith("Contact")).join("; ") || "contact updated",
    });
  }

  return { applied, skipped };
}

async function logAgentRun(
  admin: MessagingDbClient,
  input: {
    businessId: string;
    conversationId: string | null;
    contactId: string;
    channel: string;
    clientMessage: string;
    routingMethod: AgentRoutingMethod | null;
    actionsApplied: string[];
    success: boolean;
    errorMessage?: string;
  },
): Promise<void> {
  await admin.from("agent_runs").insert({
    business_id: input.businessId,
    conversation_id: input.conversationId,
    contact_id: input.contactId,
    channel: input.channel,
    client_message: input.clientMessage.slice(0, 2000),
    routing_method: input.routingMethod,
    actions: input.actionsApplied,
    success: input.success,
    error_message: input.errorMessage ?? null,
  });
}

export async function planAgentCrmActions(input: {
  businessId: string;
  contact: ContactSnapshot;
  message: string;
  conversationHistory: ConversationTurn[];
  agent: RoutableAiAgent | null;
}): Promise<ExecutorPlan | null> {
  const result = await generateText({
    businessId: input.businessId,
    callType: "crm_plan",
    systemInstruction:
      "You extract structured CRM data from customer messages. Reply with valid JSON only. Never invent contact details.",
    prompt: buildExecutorPrompt(input),
  });

  if (!result.success) {
    return null;
  }

  const parsed = parseJsonObject(result.data.text);

  if (!parsed) {
    return null;
  }

  const validated = executorPlanSchema.safeParse(parsed);

  return validated.success ? validated.data : null;
}

async function executePlanOnContact(input: {
  admin: MessagingDbClient;
  businessId: string;
  contact: ContactSnapshot;
  contactId: string;
  conversationId?: string | null;
  channel: string;
  clientMessage: string;
  agent: RoutableAiAgent | null;
  routingMethod?: AgentRoutingMethod | null;
  plan: ExecutorPlan;
  suppressRunLog?: boolean;
}): Promise<AgentExecutorResult> {
  const planIdempotencyKey = buildExecutorPlanIdempotencyKey({
    conversationId: input.conversationId,
    clientMessage: input.clientMessage,
  });

  if (
    await hasCrmIdempotencyKey(input.admin, input.businessId, planIdempotencyKey)
  ) {
    return {
      success: true,
      actionsApplied: [],
      skippedDuplicates: [formatSkippedDuplicate("executor_plan")],
      clientSummary: "",
      rawPlan: input.plan,
      planDuplicateSkipped: true,
    };
  }

  try {
    const { applied: actionsApplied, skipped: skippedDuplicates } =
      await applyExecutorPlan(
      input.admin,
      input.businessId,
      input.contact,
      input.plan,
      {
        conversationId: input.conversationId,
        clientMessage: input.clientMessage,
        channel: input.channel as MessagingChannel,
        contactId: input.contactId,
        contactName: input.contact.name,
      },
    );

    const clientSummary = sanitizeCustomerFacingSummary(
      input.plan.clientSummary,
    ) ?? "";

    if (!input.suppressRunLog) {
      await logAgentRun(input.admin, {
        businessId: input.businessId,
        conversationId: input.conversationId ?? null,
        contactId: input.contactId,
        channel: input.channel,
        clientMessage: input.clientMessage,
        routingMethod: input.routingMethod ?? null,
        actionsApplied,
        success: true,
      });
    }

    await recordCrmIdempotencyKey(input.admin, {
      businessId: input.businessId,
      idempotencyKey: planIdempotencyKey,
      actionType: "executor_plan",
    });

    console.info(
      "[agent-executor]",
      JSON.stringify({
        contactId: input.contactId,
        actionsApplied,
        skippedDuplicates,
      }),
    );

    return {
      success: true,
      actionsApplied,
      skippedDuplicates,
      clientSummary,
      rawPlan: input.plan,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "CRM action failed";

    if (!input.suppressRunLog) {
      await logAgentRun(input.admin, {
        businessId: input.businessId,
        conversationId: input.conversationId ?? null,
        contactId: input.contactId,
        channel: input.channel,
        clientMessage: input.clientMessage,
        routingMethod: input.routingMethod ?? null,
        actionsApplied: [],
        success: false,
        errorMessage,
      });
    }

    return {
      success: false,
      actionsApplied: [],
      skippedDuplicates: [],
      clientSummary: "",
      rawPlan: null,
      errorMessage,
    };
  }
}

async function applyCreateContact(
  admin: MessagingDbClient,
  businessId: string,
  conversationId: string,
  channel: MessagingChannel,
  action: Extract<ExecutorAction, { type: "create_contact" }>,
): Promise<{ contactId: string; label: string } | null> {
  const name = action.name.trim();

  if (!name) {
    return null;
  }

  const phone =
    action.phone?.trim() ||
    `pending:${conversationId.slice(0, 8)}`;

  const customFields: ContactCustomFields = {};

  if (action.company?.trim()) {
    customFields.company = action.company.trim();
  }

  const { data, error } = await admin
    .from("contacts")
    .insert({
      business_id: businessId,
      name,
      phone_number: phone,
      email: action.email?.trim() || null,
      channel,
      pipeline_stage: action.pipelineStage ?? "new",
      custom_fields: customFields as unknown as Record<string, string>,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create contact");
  }

  const { error: linkError } = await admin
    .from("conversations")
    .update({ contact_id: data.id })
    .eq("id", conversationId)
    .eq("business_id", businessId);

  if (linkError) {
    throw new Error(linkError.message);
  }

  return {
    contactId: data.id,
    label: `Contact created: ${name}`,
  };
}

export async function applyCreateContactFromPlan(input: {
  admin: MessagingDbClient;
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  action: Extract<ExecutorAction, { type: "create_contact" }>;
}): Promise<{ contactId: string; label: string } | null> {
  return applyCreateContact(
    input.admin,
    input.businessId,
    input.conversationId,
    input.channel,
    input.action,
  );
}

export async function applyPreparedExecutorPlan(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  conversationId?: string | null;
  channel: string;
  clientMessage: string;
  agent: RoutableAiAgent | null;
  routingMethod?: AgentRoutingMethod | null;
  plan: ExecutorPlan;
  suppressRunLog?: boolean;
}): Promise<AgentExecutorResult> {
  const contact = await loadContactSnapshot(
    input.admin,
    input.businessId,
    input.contactId,
  );

  if (!contact) {
    return {
      success: false,
      actionsApplied: [],
      skippedDuplicates: [],
      clientSummary: "",
      rawPlan: null,
      errorMessage: "Contact not found",
    };
  }

  return executePlanOnContact({
    admin: input.admin,
    businessId: input.businessId,
    contact,
    contactId: input.contactId,
    conversationId: input.conversationId,
    channel: input.channel,
    clientMessage: input.clientMessage,
    agent: input.agent,
    routingMethod: input.routingMethod,
    plan: input.plan,
    suppressRunLog: input.suppressRunLog,
  });
}
