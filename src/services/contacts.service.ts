import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  CONTACTS_MESSAGES,
  CONTACTS_PAGE_SIZE,
} from "@/features/contacts/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  listCrmDealsForContact,
  syncContactToPrimaryDeal,
} from "@/services/crm-deals.service";
import { listCrmTasksForContact } from "@/services/crm-tasks.service";
import { generateText, getProviderAvailability } from "@/services/llm.service";
import type {
  ContactActionResult,
  ContactCustomFields,
  ContactProfileData,
  ContactTimelineEntry,
  DeleteContactInput,
  GenerateContactInsightsInput,
  ContactPipelinePageData,
  GenerateContactInsightsResult,
  ContactSegment,
  PipelineStage,
  UnifiedContactItem,
  UnifiedContactsPageData,
  UpdateContactInput,
  UpdateContactPipelineStageInput,
} from "@/types/contact.types";
import {
  deleteContactSchema,
  generateContactInsightsSchema,
  PIPELINE_STAGES,
  updateContactPipelineStageSchema,
  updateContactSchema,
} from "@/types/contact.types";
import type { MessagingChannel } from "@/types/database.types";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

type ContactRow = {
  id: string;
  name: string;
  phone_number: string;
  email?: string | null;
  tags?: string[] | null;
  custom_fields?: ContactCustomFields | Record<string, string> | null;
  lead_score?: number | null;
  ai_summary?: string | null;
  pipeline_stage?: string | null;
  deal_value?: number | null;
  expected_close_date?: string | null;
  sentiment?: string | null;
  channel: MessagingChannel;
  last_message_at: string | null;
};

function parseCustomFields(
  value: ContactRow["custom_fields"],
): ContactCustomFields {
  if (!value || typeof value !== "object") {
    return {};
  }

  return {
    company:
      typeof value.company === "string" && value.company.trim().length > 0
        ? value.company.trim()
        : undefined,
    notes:
      typeof value.notes === "string" && value.notes.trim().length > 0
        ? value.notes.trim()
        : undefined,
    location:
      typeof value.location === "string" && value.location.trim().length > 0
        ? value.location.trim()
        : undefined,
  };
}

function parsePipelineStage(value: string | null | undefined): PipelineStage {
  if (
    value === "new" ||
    value === "qualified" ||
    value === "proposal" ||
    value === "won" ||
    value === "lost"
  ) {
    return value;
  }

  return "new";
}

function mapContactRow(
  contact: ContactRow,
  lastMessagePreview: string | null = null,
): UnifiedContactItem {
  return {
    id: contact.id,
    name: contact.name,
    identifier: contact.phone_number,
    email: contact.email ?? null,
    tags: contact.tags ?? [],
    customFields: parseCustomFields(contact.custom_fields),
    leadScore: contact.lead_score ?? null,
    aiSummary: contact.ai_summary ?? null,
    pipelineStage: parsePipelineStage(contact.pipeline_stage),
    dealValue:
      typeof contact.deal_value === "number" ? contact.deal_value : null,
    expectedCloseDate: contact.expected_close_date ?? null,
    sentiment:
      contact.sentiment === "positive" ||
      contact.sentiment === "neutral" ||
      contact.sentiment === "negative"
        ? contact.sentiment
        : null,
    channel: contact.channel,
    lastMessageAt: contact.last_message_at,
    lastMessagePreview,
  };
}

function revalidateContactPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.contacts);
}

function isContactSegment(value: string | null | undefined): value is ContactSegment {
  return value === "all" || value === "hot_leads" || value === "no_reply_48h";
}

async function filterContactsBySegment(
  contacts: UnifiedContactItem[],
  segment: ContactSegment,
  businessId: string,
): Promise<UnifiedContactItem[]> {
  if (segment === "all") {
    return contacts;
  }

  if (segment === "hot_leads") {
    return contacts.filter(
      (contact) => contact.leadScore !== null && contact.leadScore >= 70,
    );
  }

  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const supabase = await createClient();
  const contactIds = contacts.map((contact) => contact.id);

  if (contactIds.length === 0) {
    return [];
  }

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .eq("business_id", businessId)
    .in("contact_id", contactIds);

  const conversationIds = (conversations ?? []).map(
    (conversation) => conversation.id,
  );

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, sender_type, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const conversationToContact = new Map(
    (conversations ?? []).map((conversation) => [
      conversation.id,
      conversation.contact_id,
    ]),
  );

  const latestByContactId = new Map<
    string,
    { senderType: string; createdAt: string }
  >();

  for (const message of messages ?? []) {
    const contactId = conversationToContact.get(message.conversation_id);

    if (contactId && !latestByContactId.has(contactId)) {
      latestByContactId.set(contactId, {
        senderType: message.sender_type,
        createdAt: message.created_at,
      });
    }
  }

  return contacts.filter((contact) => {
    const latest = latestByContactId.get(contact.id);

    if (!latest || latest.senderType !== "client") {
      return false;
    }

    return new Date(latest.createdAt).getTime() <= cutoff;
  });
}

function isMessagingChannel(value: string): value is MessagingChannel {
  return (
    value === "whatsapp" ||
    value === "instagram" ||
    value === "telegram" ||
    value === "website_forms"
  );
}

async function attachLastMessagePreviews(
  contacts: ContactRow[],
): Promise<UnifiedContactItem[]> {
  if (contacts.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const contactIds = contacts.map((contact) => contact.id);

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .in("contact_id", contactIds);

  const conversationIds = (conversations ?? []).map(
    (conversation) => conversation.id,
  );

  const previewByContactId = new Map<string, string>();

  if (conversationIds.length > 0) {
    const { data: messages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    const conversationToContact = new Map(
      (conversations ?? []).map((conversation) => [
        conversation.id,
        conversation.contact_id,
      ]),
    );

    for (const message of messages ?? []) {
      const contactId = conversationToContact.get(message.conversation_id);

      if (contactId && !previewByContactId.has(contactId)) {
        previewByContactId.set(contactId, message.content);
      }
    }
  }

  return contacts.map((contact) =>
    mapContactRow(contact, previewByContactId.get(contact.id) ?? null),
  );
}

function isContactsView(value: string | null | undefined): value is "list" | "pipeline" {
  return value === "list" || value === "pipeline";
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function parseContactsPage(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export type GetUnifiedContactsInput = {
  channel?: string | null;
  segment?: string | null;
  view?: string | null;
  q?: string | null;
  page?: string | null;
  contact?: string | null;
};

async function resolveActiveContactId(
  businessId: string,
  contactId: string | null | undefined,
): Promise<string | null> {
  const candidate = contactId?.trim();

  if (!candidate || !UUID_PATTERN.test(candidate)) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .eq("id", candidate)
    .maybeSingle();

  return data?.id ?? null;
}

function buildContactsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  activeChannelFilter: MessagingChannel | null,
  activeSegment: ContactSegment,
  searchQuery: string,
) {
  let query = supabase
    .from("contacts")
    .select(
      "id, name, phone_number, email, tags, custom_fields, lead_score, ai_summary, pipeline_stage, deal_value, expected_close_date, sentiment, channel, last_message_at",
      {
        count: "exact",
      },
    )
    .eq("business_id", businessId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (activeChannelFilter) {
    query = query.eq("channel", activeChannelFilter);
  }

  if (activeSegment === "hot_leads") {
    query = query.gte("lead_score", 70);
  }

  if (searchQuery) {
    const pattern = `%${escapeIlikePattern(searchQuery)}%`;
    query = query.or(
      `name.ilike.${pattern},phone_number.ilike.${pattern},email.ilike.${pattern}`,
    );
  }

  return query;
}

export async function getUnifiedContacts(
  input: GetUnifiedContactsInput = {},
): Promise<UnifiedContactsPageData> {
  const activeChannelFilter =
    input.channel && isMessagingChannel(input.channel) ? input.channel : null;
  const activeSegment = isContactSegment(input.segment) ? input.segment : "all";
  const activeView = isContactsView(input.view) ? input.view : "list";
  const searchQuery = (input.q ?? "").trim();
  const page = parseContactsPage(input.page);
  const pageSize = CONTACTS_PAGE_SIZE;

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      contacts: [],
      total: 0,
      activeChannelFilter,
      activeSegment,
      activeView,
      activeContactId: null,
      searchQuery,
      page,
      pageSize,
      hasMore: false,
    };
  }

  const supabase = await createClient();
  const activeContactId = await resolveActiveContactId(businessId, input.contact);

  if (activeSegment === "no_reply_48h") {
    const { data } = await buildContactsQuery(
      supabase,
      businessId,
      activeChannelFilter,
      activeSegment,
      searchQuery,
    ).limit(500);

    const allContacts = await attachLastMessagePreviews((data ?? []) as ContactRow[]);
    const filtered = await filterContactsBySegment(
      allContacts,
      activeSegment,
      businessId,
    );
    const offset = (page - 1) * pageSize;
    const contacts = filtered.slice(offset, offset + pageSize);

    return {
      hasBusiness: true,
      contacts,
      total: filtered.length,
      activeChannelFilter,
      activeSegment,
      activeView,
      activeContactId,
      searchQuery,
      page,
      pageSize,
      hasMore: offset + contacts.length < filtered.length,
    };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await buildContactsQuery(
    supabase,
    businessId,
    activeChannelFilter,
    activeSegment,
    searchQuery,
  ).range(from, to);

  const contacts = await attachLastMessagePreviews((data ?? []) as ContactRow[]);
  const total = count ?? contacts.length;

  return {
    hasBusiness: true,
    contacts,
    total,
    activeChannelFilter,
    activeSegment,
    activeView,
    activeContactId,
    searchQuery,
    page,
    pageSize,
    hasMore: from + contacts.length < total,
  };
}

export async function getContactPipeline(
  input: Pick<GetUnifiedContactsInput, "channel" | "q"> = {},
): Promise<ContactPipelinePageData> {
  const activeChannelFilter =
    input.channel && isMessagingChannel(input.channel) ? input.channel : null;
  const searchQuery = (input.q ?? "").trim();
  const emptyColumns = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = [];
      return acc;
    },
    {} as Record<PipelineStage, UnifiedContactItem[]>,
  );

  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      columns: emptyColumns,
    };
  }

  const supabase = await createClient();
  const { data } = await buildContactsQuery(
    supabase,
    businessId,
    activeChannelFilter,
    "all",
    searchQuery,
  ).limit(500);

  const contacts = await attachLastMessagePreviews((data ?? []) as ContactRow[]);
  const columns = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = contacts.filter((contact) => contact.pipelineStage === stage);
      return acc;
    },
    {} as Record<PipelineStage, UnifiedContactItem[]>,
  );

  return {
    hasBusiness: true,
    columns,
  };
}

export async function updateContactPipelineStage(
  input: UpdateContactPipelineStageInput,
): Promise<ContactActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  const parsed = updateContactPipelineStageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.contactSaveFailed,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  const supabase = await createClient();
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("deal_value, expected_close_date")
    .eq("id", parsed.data.contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  const { error } = await supabase
    .from("contacts")
    .update({ pipeline_stage: parsed.data.pipelineStage })
    .eq("id", parsed.data.contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  await syncContactToPrimaryDeal(parsed.data.contactId, businessId, {
    dealValue: existingContact?.deal_value ?? null,
    pipelineStage: parsed.data.pipelineStage,
    expectedCloseDate: existingContact?.expected_close_date ?? null,
  });

  revalidateContactPaths();
  return { success: true };
}

export async function getContactProfile(
  contactId: string,
): Promise<ContactProfileData | null> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: contactRow } = await supabase
    .from("contacts")
    .select(
      "id, name, phone_number, email, tags, custom_fields, lead_score, ai_summary, pipeline_stage, deal_value, expected_close_date, sentiment, channel, last_message_at",
    )
    .eq("id", contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!contactRow) {
    return null;
  }

  const enriched = await attachLastMessagePreviews([contactRow]);
  const contact = enriched[0];

  if (!contact) {
    return null;
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, internal_note, updated_at")
    .eq("contact_id", contactId)
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let timeline: ContactTimelineEntry[] = [];

  if (conversation) {
    const { data: messages } = await supabase
      .from("messages")
      .select(
        "id, content, sender_type, channel, created_at, ai_generated",
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(25);

    timeline =
      messages?.map((message) => ({
        id: message.id,
        activityType: "message" as const,
        content: message.content,
        senderType: message.sender_type,
        channel: message.channel,
        createdAt: message.created_at,
        aiGenerated: message.ai_generated,
      })) ?? [];

    if (conversation.internal_note?.trim()) {
      timeline.push({
        id: `note-${conversation.id}`,
        activityType: "internal_note",
        content: conversation.internal_note.trim(),
        channel: contact.channel,
        createdAt: conversation.updated_at,
      });
    }

    timeline.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  const [tasks, deals] = await Promise.all([
    listCrmTasksForContact(contactId),
    listCrmDealsForContact(contactId),
  ]);

  return {
    contact,
    conversationId: conversation?.id ?? null,
    timeline,
    tasks,
    deals,
  };
}

export async function updateContact(
  input: UpdateContactInput,
): Promise<ContactActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  const parsed = updateContactSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.contactSaveFailed,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  const email = parsed.data.email?.trim() ?? "";

  if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Enter a valid email address.",
      },
    };
  }

  const customFields: ContactCustomFields = {};

  if (parsed.data.customFields.company?.trim()) {
    customFields.company = parsed.data.customFields.company.trim();
  }

  if (parsed.data.customFields.notes?.trim()) {
    customFields.notes = parsed.data.customFields.notes.trim();
  }

  if (parsed.data.customFields.location?.trim()) {
    customFields.location = parsed.data.customFields.location.trim();
  }

  const supabase = await createClient();
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("pipeline_stage, deal_value, expected_close_date, tags, name, channel")
    .eq("id", parsed.data.contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  const { error } = await supabase
    .from("contacts")
    .update({
      name: parsed.data.name.trim(),
      email: email && email.length > 0 ? email : null,
      tags: parsed.data.tags,
      custom_fields: customFields,
      deal_value: parsed.data.dealValue ?? null,
      expected_close_date: parsed.data.expectedCloseDate?.trim() || null,
      ...(parsed.data.pipelineStage
        ? { pipeline_stage: parsed.data.pipelineStage }
        : {}),
    })
    .eq("id", parsed.data.contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  await syncContactToPrimaryDeal(parsed.data.contactId, businessId, {
    dealValue:
      parsed.data.dealValue !== undefined
        ? parsed.data.dealValue
        : (existingContact?.deal_value ?? null),
    pipelineStage:
      parsed.data.pipelineStage ??
      (existingContact?.pipeline_stage as PipelineStage) ??
      "new",
    expectedCloseDate:
      parsed.data.expectedCloseDate !== undefined
        ? parsed.data.expectedCloseDate?.trim() || null
        : (existingContact?.expected_close_date ?? null),
  });

  const previousTags = new Set(
    (existingContact?.tags ?? []).map((tag) => tag.toLowerCase()),
  );
  const addedTags = parsed.data.tags.filter(
    (tag) => !previousTags.has(tag.toLowerCase()),
  );

  if (addedTags.length > 0) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .eq("contact_id", parsed.data.contactId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { processTagAddedAutomations } = await import(
      "@/services/automation-engine.service"
    );

    for (const addedTag of addedTags) {
      await processTagAddedAutomations({
        businessId,
        contactId: parsed.data.contactId,
        contactName: parsed.data.name.trim() || existingContact?.name || "Contact",
        channel: existingContact?.channel ?? "whatsapp",
        conversationId: conversation?.id ?? null,
        addedTag,
      });
    }
  }

  revalidateContactPaths();
  return { success: true };
}

export async function deleteContact(
  input: DeleteContactInput,
): Promise<ContactActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: CONTACTS_MESSAGES.contactDeleteFailed,
      },
    };
  }

  const parsed = deleteContactSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.contactDeleteFailed,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CONTACTS_MESSAGES.contactDeleteFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", parsed.data.contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: {
        code: "DELETE_FAILED",
        message: CONTACTS_MESSAGES.contactDeleteFailed,
      },
    };
  }

  revalidateContactPaths();
  revalidatePath(DASHBOARD_ROUTES.chats);
  return { success: true };
}

function parseContactInsightsPayload(raw: string): {
  leadScore: number;
  aiSummary: string;
} | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      leadScore?: number;
      lead_score?: number;
      aiSummary?: string;
      ai_summary?: string;
      summary?: string;
    };

    const rawScore = parsed.leadScore ?? parsed.lead_score;
    const summary =
      parsed.aiSummary?.trim() ??
      parsed.ai_summary?.trim() ??
      parsed.summary?.trim() ??
      "";

    if (typeof rawScore !== "number" || !Number.isFinite(rawScore) || !summary) {
      return null;
    }

    const leadScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    return {
      leadScore,
      aiSummary: summary.slice(0, 2000),
    };
  } catch {
    return null;
  }
}

export async function generateContactInsights(
  input: GenerateContactInsightsInput,
): Promise<GenerateContactInsightsResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: CONTACTS_MESSAGES.insightsFailed,
      },
    };
  }

  const providers = getProviderAvailability();

  if (!providers.gemini && !providers.openai && !providers.claude) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: CONTACTS_MESSAGES.insightsUnavailable,
      },
    };
  }

  const parsed = generateContactInsightsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.insightsFailed,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CONTACTS_MESSAGES.insightsFailed,
      },
    };
  }

  const profile = await getContactProfile(parsed.data.contactId);

  if (!profile) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CONTACTS_MESSAGES.insightsFailed,
      },
    };
  }

  const messageLines = profile.timeline
    .filter((entry) => entry.activityType === "message")
    .slice(0, 15)
    .map((entry) => {
      const sender =
        entry.senderType === "client"
          ? "Customer"
          : entry.aiGenerated || entry.senderType === "ai"
            ? "AI"
            : "Team";

      return `${sender}: ${entry.content}`;
    });

  const prompt = [
    "Analyze this CRM contact and return JSON only.",
    `Name: ${profile.contact.name}`,
    `Channel: ${profile.contact.channel}`,
    `Email: ${profile.contact.email ?? "none"}`,
    `Tags: ${profile.contact.tags.join(", ") || "none"}`,
    `Company: ${profile.contact.customFields.company ?? "none"}`,
    `Notes: ${profile.contact.customFields.notes ?? "none"}`,
    `Recent messages:\n${messageLines.join("\n") || "No messages yet."}`,
    'Respond with: {"leadScore":0-100,"aiSummary":"2-3 sentence CRM summary"}',
  ].join("\n");

  const aiResult = await generateText({
    businessId,
    prompt,
    systemInstruction:
      "You are a CRM analyst. Score lead intent 0-100 and write a concise summary for sales teams. Reply with valid JSON only.",
  });

  if (!aiResult.success) {
    return {
      success: false,
      error: {
        code: "AI_FAILED",
        message: aiResult.error.message || CONTACTS_MESSAGES.insightsFailed,
      },
    };
  }

  const insights = parseContactInsightsPayload(aiResult.data.text);

  if (!insights) {
    return {
      success: false,
      error: {
        code: "AI_FAILED",
        message: CONTACTS_MESSAGES.insightsFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      lead_score: insights.leadScore,
      ai_summary: insights.aiSummary,
    })
    .eq("id", parsed.data.contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: CONTACTS_MESSAGES.insightsFailed,
      },
    };
  }

  revalidateContactPaths();
  return {
    success: true,
    data: insights,
  };
}
