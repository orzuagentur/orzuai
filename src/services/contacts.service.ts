import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  CONTACTS_MESSAGES,
  CONTACTS_PAGE_SIZE,
} from "@/features/contacts/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  listCrmDealsForContact,
  syncContactToPrimaryDeal,
} from "@/services/crm-deals.service";
import { listCrmTasksForContact } from "@/services/crm-tasks.service";
import { generateText, getProviderAvailability } from "@/services/llm.service";
import { resolveContactAvatarSignedUrls } from "@/services/contact-avatar-storage.service";
import {
  parseAdditionalContacts,
  type AdditionalContactEntry,
} from "@/utils/contact-additional-contacts";
import {
  parseContactProfileFields,
  type ContactProfileFieldEntry,
} from "@/utils/contact-profile-fields";
import { resolveAvatarUrlFromMap } from "@/utils/contact-avatar";
import { parseAgentRunAction } from "@/lib/ai/agent-run-actions";
import type {
  ContactActionResult,
  ContactCustomFields,
  ContactFieldIconOption,
  ContactProfileData,
  ContactTimelineEntry,
  DeleteContactInput,
  GenerateContactInsightsInput,
  ContactPipelinePageData,
  GenerateContactInsightsResult,
  ContactSegment,
  LeadSegment,
  LeadsPageData,
  PipelineStage,
  UnifiedContactItem,
  UnifiedContactsPageData,
  UpdateContactInput,
  UpdateContactPipelineStageInput,
} from "@/types/contact.types";
import {
  deleteContactSchema,
  generateContactInsightsSchema,
  ACTIVE_LEAD_PIPELINE_STAGES,
  PIPELINE_STAGES,
  updateContactPipelineStageSchema,
  updateContactSchema,
} from "@/types/contact.types";
import type { ContactPickerItem } from "@/types/crm-deal.types";
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
  is_favorite?: boolean | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

function parseCollectionFields(
  value: unknown,
): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      typeof entry[0] === "string" &&
      typeof entry[1] === "string" &&
      entry[1].trim().length > 0,
  );

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    entries.map(([key, fieldValue]) => [key, fieldValue.trim()]),
  );
}

function parseCustomFields(
  value: ContactRow["custom_fields"],
): ContactCustomFields {
  if (!value || typeof value !== "object") {
    return {};
  }

  const additionalContacts = parseAdditionalContacts(
    "additionalContacts" in value ? value.additionalContacts : undefined,
  );
  const profileFields = parseContactProfileFields(
    "profileFields" in value ? value.profileFields : undefined,
  );
  const collection = parseCollectionFields(
    "collection" in value ? value.collection : undefined,
  );
  const whatsappChatJid =
    "whatsappChatJid" in value &&
    typeof value.whatsappChatJid === "string" &&
    value.whatsappChatJid.trim().length > 0
      ? value.whatsappChatJid.trim()
      : undefined;

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
    additionalContacts:
      additionalContacts.length > 0 ? additionalContacts : undefined,
    profileFields: profileFields.length > 0 ? profileFields : undefined,
    whatsappChatJid,
    collection,
  };
}

export async function listContactFieldIcons(): Promise<ContactFieldIconOption[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_field_icons")
    .select("key, label")
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    key: row.key,
    label: row.label,
  }));
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
  avatarSignedUrl: string | null = null,
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
    isFavorite: contact.is_favorite ?? false,
    avatarUrl: avatarSignedUrl,
    createdAt: contact.created_at ?? new Date(0).toISOString(),
  };
}

function revalidateContactPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.contacts);
}

function isContactSegment(value: string | null | undefined): value is ContactSegment {
  return value === "all" || value === "hot_leads" || value === "no_reply_48h";
}

function isLeadSegment(value: string | null | undefined): value is LeadSegment {
  return (
    value === "all_leads" ||
    value === "hot_leads" ||
    value === "warm_leads" ||
    value === "stale_leads"
  );
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
    value === "website_forms" ||
    value === "facebook_messenger" ||
    value === "email" ||
    value === "voice" ||
    value === "sms"
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

  const avatarSignedUrlMap = await resolveContactAvatarSignedUrls(
    contacts.map((contact) => contact.avatar_url),
  );

  return contacts.map((contact) =>
    mapContactRow(
      contact,
      previewByContactId.get(contact.id) ?? null,
      resolveAvatarUrlFromMap(contact.avatar_url, avatarSignedUrlMap),
    ),
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
  profile?: string | null;
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
      "id, name, phone_number, email, tags, custom_fields, lead_score, ai_summary, pipeline_stage, deal_value, expected_close_date, sentiment, channel, last_message_at, is_favorite, avatar_url, created_at",
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
      activeTab: "contacts",
      activeChannelFilter,
      activeSegment,
      activeView,
      activeContactId: null,
      showProfilePanel: false,
      searchQuery,
      page,
      pageSize,
      hasMore: false,
    };
  }

  const supabase = await createClient();
  const activeContactId = await resolveActiveContactId(businessId, input.contact);
  const showProfilePanel =
    input.profile === "1" && activeContactId !== null;

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
      activeTab: "contacts",
      activeChannelFilter,
      activeSegment,
      activeView,
      activeContactId,
      showProfilePanel,
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
    activeTab: "contacts",
    activeChannelFilter,
    activeSegment,
    activeView,
    activeContactId,
    showProfilePanel,
    searchQuery,
    page,
    pageSize,
    hasMore: from + contacts.length < total,
  };
}

export type GetLeadsContactsInput = {
  channel?: string | null;
  leadSegment?: string | null;
  view?: string | null;
  q?: string | null;
  page?: string | null;
  contact?: string | null;
  profile?: string | null;
};

function buildLeadsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  activeChannelFilter: MessagingChannel | null,
  activeLeadSegment: LeadSegment,
  searchQuery: string,
) {
  let query = supabase
    .from("contacts")
    .select(
      "id, name, phone_number, email, tags, custom_fields, lead_score, ai_summary, pipeline_stage, deal_value, expected_close_date, sentiment, channel, last_message_at, is_favorite, avatar_url, created_at",
      { count: "exact" },
    )
    .eq("business_id", businessId)
    .in("pipeline_stage", ACTIVE_LEAD_PIPELINE_STAGES)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (activeChannelFilter) {
    query = query.eq("channel", activeChannelFilter);
  }

  if (activeLeadSegment === "hot_leads") {
    query = query.gte("lead_score", 70);
  }

  if (activeLeadSegment === "warm_leads") {
    query = query.gte("lead_score", 40).lt("lead_score", 70);
  }

  if (searchQuery) {
    const pattern = `%${escapeIlikePattern(searchQuery)}%`;
    query = query.or(
      `name.ilike.${pattern},phone_number.ilike.${pattern},email.ilike.${pattern}`,
    );
  }

  return query;
}

async function filterLeadsByStaleSegment(
  contacts: UnifiedContactItem[],
  businessId: string,
): Promise<UnifiedContactItem[]> {
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
    .eq("sender_type", "client")
    .order("created_at", { ascending: false });

  const lastClientMessageByConversationId = new Map<string, string>();

  for (const message of messages ?? []) {
    if (!lastClientMessageByConversationId.has(message.conversation_id)) {
      lastClientMessageByConversationId.set(
        message.conversation_id,
        message.created_at,
      );
    }
  }

  const conversationByContactId = new Map(
    (conversations ?? []).map((conversation) => [
      conversation.contact_id,
      conversation.id,
    ]),
  );

  return contacts.filter((contact) => {
    const conversationId = conversationByContactId.get(contact.id);

    if (!conversationId) {
      return false;
    }

    const lastClientMessageAt =
      lastClientMessageByConversationId.get(conversationId);

    if (!lastClientMessageAt) {
      return false;
    }

    return new Date(lastClientMessageAt).getTime() < cutoff;
  });
}

export async function getLeadsContacts(
  input: GetLeadsContactsInput = {},
): Promise<LeadsPageData> {
  const activeChannelFilter =
    input.channel && isMessagingChannel(input.channel) ? input.channel : null;
  const activeLeadSegment = isLeadSegment(input.leadSegment)
    ? input.leadSegment
    : "all_leads";
  const activeView = isContactsView(input.view) ? input.view : "list";
  const searchQuery = (input.q ?? "").trim();
  const page = parseContactsPage(input.page);
  const pageSize = CONTACTS_PAGE_SIZE;

  const businessId = await getOwnedBusinessId();
  const empty: LeadsPageData = {
    hasBusiness: false,
    contacts: [],
    total: 0,
    activeTab: "leads",
    activeChannelFilter,
    activeLeadSegment,
    activeSegment: "all",
    activeView,
    activeContactId: null,
    showProfilePanel: false,
    searchQuery,
    page,
    pageSize,
    hasMore: false,
  };

  if (!businessId || !hasSupabaseEnv()) {
    return empty;
  }

  const supabase = await createClient();
  const activeContactId = await resolveActiveContactId(businessId, input.contact);
  const showProfilePanel =
    input.profile === "1" && activeContactId !== null;

  if (activeLeadSegment === "stale_leads") {
    const { data } = await buildLeadsQuery(
      supabase,
      businessId,
      activeChannelFilter,
      "all_leads",
      searchQuery,
    ).limit(500);

    const allContacts = await attachLastMessagePreviews((data ?? []) as ContactRow[]);
    const filtered = await filterLeadsByStaleSegment(allContacts, businessId);
    const offset = (page - 1) * pageSize;
    const contacts = filtered.slice(offset, offset + pageSize);

    return {
      hasBusiness: true,
      contacts,
      total: filtered.length,
      activeTab: "leads",
      activeChannelFilter,
      activeLeadSegment,
      activeSegment: "all",
      activeView,
      activeContactId,
      showProfilePanel,
      searchQuery,
      page,
      pageSize,
      hasMore: offset + contacts.length < filtered.length,
    };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await buildLeadsQuery(
    supabase,
    businessId,
    activeChannelFilter,
    activeLeadSegment,
    searchQuery,
  ).range(from, to);

  const contacts = await attachLastMessagePreviews((data ?? []) as ContactRow[]);
  const total = count ?? contacts.length;

  return {
    hasBusiness: true,
    contacts,
    total,
    activeTab: "leads",
    activeChannelFilter,
    activeLeadSegment,
    activeSegment: "all",
    activeView,
    activeContactId,
    showProfilePanel,
    searchQuery,
    page,
    pageSize,
    hasMore: from + contacts.length < total,
  };
}

export async function getLeadsPipeline(
  input: Pick<GetLeadsContactsInput, "channel" | "q" | "leadSegment"> = {},
): Promise<ContactPipelinePageData> {
  const activeChannelFilter =
    input.channel && isMessagingChannel(input.channel) ? input.channel : null;
  const activeLeadSegment = isLeadSegment(input.leadSegment)
    ? input.leadSegment
    : "all_leads";
  const searchQuery = (input.q ?? "").trim();
  const emptyColumns = ACTIVE_LEAD_PIPELINE_STAGES.reduce(
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
  const { data } = await buildLeadsQuery(
    supabase,
    businessId,
    activeChannelFilter,
    activeLeadSegment === "stale_leads" ? "all_leads" : activeLeadSegment,
    searchQuery,
  ).limit(500);

  let contacts = await attachLastMessagePreviews((data ?? []) as ContactRow[]);

  if (activeLeadSegment === "stale_leads") {
    contacts = await filterLeadsByStaleSegment(contacts, businessId);
  }

  const columns = ACTIVE_LEAD_PIPELINE_STAGES.reduce(
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

export async function searchContactsForPicker(
  search: string,
  limit = 20,
): Promise<ContactPickerItem[]> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const searchQuery = search.trim();
  let query = supabase
    .from("contacts")
    .select("id, name, phone_number, channel")
    .eq("business_id", businessId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (searchQuery) {
    const pattern = `%${escapeIlikePattern(searchQuery)}%`;
    query = query.or(
      `name.ilike.${pattern},phone_number.ilike.${pattern},email.ilike.${pattern}`,
    );
  }

  const { data } = await query;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone_number,
    channel: row.channel,
  }));
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
      "id, name, phone_number, email, tags, custom_fields, lead_score, ai_summary, pipeline_stage, deal_value, expected_close_date, sentiment, channel, last_message_at, is_favorite, avatar_url, created_at",
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
    .select("id, internal_note, updated_at, assigned_to")
    .eq("contact_id", contactId)
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let timeline: ContactTimelineEntry[] = [];
  let messageCount = 0;
  let assignedToEmail: string | null = null;

  if (conversation?.assigned_to && hasSupabaseEnv()) {
    const admin = createAdminClient();
    const { data: assignee } = await admin.auth.admin.getUserById(
      conversation.assigned_to,
    );
    assignedToEmail = assignee.user?.email ?? null;
  }

  if (conversation) {
    const { count: totalMessages } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id);

    messageCount = totalMessages ?? 0;

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
  }

  const { data: agentRuns } = await supabase
    .from("agent_runs")
    .select("id, actions, success, created_at, channel")
    .eq("contact_id", contactId)
    .eq("business_id", businessId)
    .eq("success", true)
    .order("created_at", { ascending: false })
    .limit(30);

  for (const run of agentRuns ?? []) {
    const actions = Array.isArray(run.actions)
      ? run.actions.filter((entry): entry is string => typeof entry === "string")
      : [];
    const channel = isMessagingChannel(run.channel)
      ? run.channel
      : contact.channel;

    for (const [index, action] of actions.entries()) {
      const parsed = parseAgentRunAction(action);

      if (parsed.kind !== "executed") {
        continue;
      }

      const label = parsed.label.trim();

      if (!label) {
        continue;
      }

      const content = label.startsWith("AI:")
        ? label
        : `AI: ${label.charAt(0).toLowerCase()}${label.slice(1)}`;

      timeline.push({
        id: `crm-${run.id}-${index}`,
        activityType: "crm_action",
        content,
        channel,
        createdAt: run.created_at,
        aiGenerated: true,
      });
    }
  }

  timeline.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  const [tasks, deals] = await Promise.all([
    listCrmTasksForContact(contactId),
    listCrmDealsForContact(contactId),
  ]);

  return {
    contact,
    conversationId: conversation?.id ?? null,
    assignedToEmail,
    messageCount,
    timeline,
    tasks,
    deals,
  };
}

export async function getContactForInboxSidebar(
  contactId: string,
): Promise<{
  contact: UnifiedContactItem;
  messageCount: number;
  deals: Awaited<ReturnType<typeof listCrmDealsForContact>>;
} | null> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: contactRow } = await supabase
    .from("contacts")
    .select(
      "id, name, phone_number, email, tags, custom_fields, lead_score, ai_summary, pipeline_stage, deal_value, expected_close_date, sentiment, channel, last_message_at, is_favorite, avatar_url, created_at",
    )
    .eq("id", contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!contactRow) {
    return null;
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", contactId)
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let messageCount = 0;

  if (conversation?.id) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id);

    messageCount = count ?? 0;
  }

  const avatarSignedUrlMap = await resolveContactAvatarSignedUrls([
    contactRow.avatar_url,
  ]);
  const contact = mapContactRow(
    contactRow as ContactRow,
    null,
    resolveAvatarUrlFromMap(contactRow.avatar_url, avatarSignedUrlMap),
  );
  const deals = await listCrmDealsForContact(contactId);

  return { contact, messageCount, deals };
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

  if (parsed.data.customFields.additionalContacts) {
    customFields.additionalContacts =
      parsed.data.customFields.additionalContacts;
  }

  if (parsed.data.customFields.profileFields) {
    customFields.profileFields = parsed.data.customFields.profileFields;
  }

  const supabase = await createClient();
  const { data: existingContact } = await supabase
    .from("contacts")
    .select(
      "pipeline_stage, deal_value, expected_close_date, tags, name, channel, custom_fields",
    )
    .eq("id", parsed.data.contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  const existingCustomFields = parseCustomFields(
    existingContact?.custom_fields as ContactRow["custom_fields"],
  );
  const mergedCustomFields: ContactCustomFields = {
    ...existingCustomFields,
    ...customFields,
  };

  if (!parsed.data.customFields.additionalContacts) {
    mergedCustomFields.additionalContacts =
      existingCustomFields.additionalContacts;
  }

  if (!parsed.data.customFields.profileFields) {
    mergedCustomFields.profileFields = existingCustomFields.profileFields;
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      name: parsed.data.name.trim(),
      email: email && email.length > 0 ? email : null,
      tags: parsed.data.tags,
      custom_fields: mergedCustomFields as unknown as Record<string, string>,
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

export async function getContactNotes(
  contactId: string,
): Promise<{ notes: string | null; name: string } | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("name, custom_fields")
    .eq("id", contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const customFields = parseCustomFields(
    data.custom_fields as ContactRow["custom_fields"],
  );

  return {
    name: data.name,
    notes: customFields.notes?.trim() || null,
  };
}

export async function updateContactNotes(input: {
  contactId: string;
  notes: string;
}): Promise<ContactActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.contactSaveFailed },
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
  const { data: existing } = await supabase
    .from("contacts")
    .select("custom_fields")
    .eq("id", input.contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  const existingCustomFields = parseCustomFields(
    existing.custom_fields as ContactRow["custom_fields"],
  );
  const nextNotes = input.notes.trim();
  const merged: ContactCustomFields = {
    ...existingCustomFields,
  };

  if (nextNotes) {
    merged.notes = nextNotes.slice(0, 4000);
  } else {
    delete merged.notes;
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      custom_fields: merged as unknown as Record<string, string>,
    })
    .eq("id", input.contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  revalidatePath(DASHBOARD_ROUTES.contacts);
  revalidatePath(DASHBOARD_ROUTES.chats);

  return { success: true };
}

export async function updateContactClientDescription(input: {
  contactId: string;
  description: string;
}): Promise<ContactActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.contactSaveFailed },
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
  const description = input.description.trim().slice(0, 800);

  const { data: existing, error: fetchError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", input.contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (fetchError || !existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      ai_summary: description.length > 0 ? description : null,
    })
    .eq("id", input.contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CONTACTS_MESSAGES.contactSaveFailed },
    };
  }

  revalidateContactPaths();
  return { success: true };
}

export async function updateContactProfileFields(
  contactId: string,
  profileFields: ContactProfileFieldEntry[],
): Promise<ContactActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: CONTACTS_MESSAGES.customFieldSaveFailed,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CONTACTS_MESSAGES.customFieldSaveFailed,
      },
    };
  }

  const supabase = await createClient();
  const iconKeys = [...new Set(profileFields.map((field) => field.iconKey))];

  if (iconKeys.length > 0) {
    const { data: icons, error: iconsError } = await supabase
      .from("contact_field_icons")
      .select("key")
      .in("key", iconKeys);

    if (iconsError) {
      return {
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: CONTACTS_MESSAGES.customFieldSaveFailed,
        },
      };
    }

    const allowed = new Set((icons ?? []).map((row) => row.key));
    if (iconKeys.some((key) => !allowed.has(key))) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: CONTACTS_MESSAGES.customFieldInvalidIcon,
        },
      };
    }
  }

  const { data: existingContact } = await supabase
    .from("contacts")
    .select("custom_fields")
    .eq("id", contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!existingContact) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CONTACTS_MESSAGES.customFieldSaveFailed,
      },
    };
  }

  const existingCustomFields = parseCustomFields(
    existingContact.custom_fields as ContactRow["custom_fields"],
  );
  const mergedCustomFields: ContactCustomFields = {
    ...existingCustomFields,
    profileFields: profileFields.length > 0 ? profileFields : undefined,
  };

  const { error } = await supabase
    .from("contacts")
    .update({
      custom_fields: mergedCustomFields as unknown as Record<string, string>,
    })
    .eq("id", contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: CONTACTS_MESSAGES.customFieldSaveFailed,
      },
    };
  }

  revalidatePath(DASHBOARD_ROUTES.contacts);
  revalidatePath(DASHBOARD_ROUTES.chats);

  return { success: true };
}

export async function updateContactAdditionalContacts(
  contactId: string,
  additionalContacts: AdditionalContactEntry[],
): Promise<ContactActionResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: CONTACTS_MESSAGES.additionalContactSaveFailed,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CONTACTS_MESSAGES.additionalContactSaveFailed,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("custom_fields")
    .eq("id", contactId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!existingContact) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CONTACTS_MESSAGES.additionalContactSaveFailed,
      },
    };
  }

  const existingCustomFields = parseCustomFields(
    existingContact.custom_fields as ContactRow["custom_fields"],
  );
  const mergedCustomFields: ContactCustomFields = {
    ...existingCustomFields,
    additionalContacts:
      additionalContacts.length > 0 ? additionalContacts : undefined,
  };

  const { error } = await supabase
    .from("contacts")
    .update({
      custom_fields: mergedCustomFields as unknown as Record<string, string>,
    })
    .eq("id", contactId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: {
        code: "UPDATE_FAILED",
        message: CONTACTS_MESSAGES.additionalContactSaveFailed,
      },
    };
  }

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
