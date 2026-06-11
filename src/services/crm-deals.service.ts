import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { normalizeDealCurrency } from "@/lib/deal-currency";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { PipelineStage } from "@/types/contact.types";
import { CONTACTS_PAGE_SIZE } from "@/features/contacts/constants";
import { resolveContactAvatarSignedUrls } from "@/services/contact-avatar-storage.service";
import type {
  CreateCrmDealInput,
  CrmDealActionResult,
  CrmDealItem,
  CrmDealListItem,
  CrmDealsPageData,
  CrmDealStatus,
  DeleteCrmDealInput,
  UpdateCrmDealInput,
} from "@/types/crm-deal.types";
import { resolveAvatarUrlFromMap } from "@/utils/contact-avatar";
import {
  createCrmDealSchema,
  deleteCrmDealSchema,
  updateCrmDealSchema,
} from "@/types/crm-deal.types";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function mapDealStatus(stage: PipelineStage): CrmDealStatus {
  if (stage === "won") {
    return "won";
  }

  if (stage === "lost") {
    return "lost";
  }

  return "open";
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function isDealStatus(value: string | null | undefined): value is CrmDealStatus {
  return value === "open" || value === "won" || value === "lost";
}

function isPipelineStage(value: string | null | undefined): value is PipelineStage {
  return (
    value === "new" ||
    value === "qualified" ||
    value === "proposal" ||
    value === "won" ||
    value === "lost"
  );
}

function parseDealsPage(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function resolveContactFromDealRow(
  contact:
    | {
        name: string;
        phone_number: string;
        channel: CrmDealListItem["contactChannel"];
        avatar_url?: string | null;
      }
    | Array<{
        name: string;
        phone_number: string;
        channel: CrmDealListItem["contactChannel"];
        avatar_url?: string | null;
      }>
    | null,
) {
  if (!contact) {
    return null;
  }

  return Array.isArray(contact) ? (contact[0] ?? null) : contact;
}

function mapCrmDeal(row: {
  id: string;
  contact_id: string;
  title: string;
  value: number | null;
  currency?: string | null;
  stage: string;
  expected_close_date: string | null;
  status: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}): CrmDealItem {
  return {
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    value: row.value,
    currency: normalizeDealCurrency(row.currency),
    stage: row.stage as PipelineStage,
    expectedCloseDate: row.expected_close_date,
    status: row.status === "won" || row.status === "lost" ? row.status : "open",
    isPrimary: row.is_primary,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function syncPrimaryDealToContact(
  contactId: string,
  businessId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: primaryDeal } = await supabase
    .from("crm_deals")
    .select("value, stage, expected_close_date")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("is_primary", true)
    .maybeSingle();

  if (!primaryDeal) {
    return;
  }

  await supabase
    .from("contacts")
    .update({
      deal_value: primaryDeal.value,
      pipeline_stage: primaryDeal.stage,
      expected_close_date: primaryDeal.expected_close_date,
    })
    .eq("id", contactId)
    .eq("business_id", businessId);
}

export async function syncContactToPrimaryDeal(
  contactId: string,
  businessId: string,
  input: {
    dealValue: number | null;
    pipelineStage: PipelineStage;
    expectedCloseDate: string | null;
  },
): Promise<void> {
  const supabase = await createClient();
  const { data: primaryDeal } = await supabase
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

  if (primaryDeal) {
    await supabase
      .from("crm_deals")
      .update(payload)
      .eq("id", primaryDeal.id)
      .eq("business_id", businessId);
    return;
  }

  await supabase.from("crm_deals").insert({
    business_id: businessId,
    contact_id: contactId,
    title: "Primary deal",
    is_primary: true,
    ...payload,
  });
}

type DealQueryRow = {
  id: string;
  contact_id: string;
  title: string;
  value: number | null;
  currency?: string | null;
  stage: string;
  expected_close_date: string | null;
  status: string;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  contact:
    | {
        name: string;
        phone_number: string;
        channel: CrmDealListItem["contactChannel"];
        avatar_url?: string | null;
      }
    | Array<{
        name: string;
        phone_number: string;
        channel: CrmDealListItem["contactChannel"];
        avatar_url?: string | null;
      }>
    | null;
};

async function mapDealQueryRows(rows: DealQueryRow[]): Promise<CrmDealListItem[]> {
  const avatarSignedUrlMap = await resolveContactAvatarSignedUrls(
    rows.map((row) => resolveContactFromDealRow(row.contact)?.avatar_url),
  );

  return rows.flatMap((row) => {
    const contact = resolveContactFromDealRow(row.contact);

    if (!contact) {
      return [];
    }

    const deal = mapCrmDeal(row);

    return [
      {
        ...deal,
        contactName: contact.name,
        contactPhone: contact.phone_number,
        contactChannel: contact.channel,
        contactAvatarUrl: resolveAvatarUrlFromMap(
          contact.avatar_url,
          avatarSignedUrlMap,
        ),
      },
    ];
  });
}

function buildDealsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  input: {
    searchQuery: string;
    stageFilter: PipelineStage | null;
    statusFilter: CrmDealStatus | null;
  },
) {
  let query = supabase
    .from("crm_deals")
    .select(
      "id, contact_id, title, value, currency, stage, expected_close_date, status, is_primary, notes, created_at, contact:contacts(name, phone_number, channel, avatar_url)",
      { count: "exact" },
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (input.stageFilter) {
    query = query.eq("stage", input.stageFilter);
  }

  if (input.statusFilter) {
    query = query.eq("status", input.statusFilter);
  }

  if (input.searchQuery) {
    const pattern = `%${escapeIlikePattern(input.searchQuery)}%`;
    query = query.or(`title.ilike.${pattern},notes.ilike.${pattern}`);
  }

  return query;
}

export type GetCrmDealsPageInput = {
  q?: string | null;
  page?: string | null;
  view?: string | null;
  stage?: string | null;
  dealStatus?: string | null;
  deal?: string | null;
  contact?: string | null;
  profile?: string | null;
};

async function resolveActiveDealId(
  businessId: string,
  dealId: string | null | undefined,
): Promise<string | null> {
  const candidate = dealId?.trim();

  if (!candidate || !UUID_PATTERN.test(candidate)) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_deals")
    .select("id")
    .eq("business_id", businessId)
    .eq("id", candidate)
    .maybeSingle();

  return data?.id ?? null;
}

export async function getCrmDealsPageData(
  input: GetCrmDealsPageInput = {},
): Promise<CrmDealsPageData> {
  const searchQuery = (input.q ?? "").trim();
  const page = parseDealsPage(input.page);
  const pageSize = CONTACTS_PAGE_SIZE;
  const activeView = input.view === "list" ? "list" : "kanban";
  const activeStageFilter = isPipelineStage(input.stage) ? input.stage : null;
  const activeStatusFilter = isDealStatus(input.dealStatus)
    ? input.dealStatus
    : null;

  const businessId = await getOwnedBusinessId();
  const empty: CrmDealsPageData = {
    hasBusiness: false,
    deals: [],
    kanbanDeals: [],
    total: 0,
    activeTab: "deals",
    activeDealId: null,
    activeContactId: null,
    showProfilePanel: false,
    searchQuery,
    activeStageFilter,
    activeStatusFilter,
    activeView,
    page,
    pageSize,
    hasMore: false,
  };

  if (!businessId || !hasSupabaseEnv()) {
    return empty;
  }

  const supabase = await createClient();
  const activeDealId = await resolveActiveDealId(businessId, input.deal);
  let activeContactId: string | null = null;

  if (activeDealId) {
    const { data: dealRow } = await supabase
      .from("crm_deals")
      .select("contact_id")
      .eq("id", activeDealId)
      .maybeSingle();

    activeContactId = dealRow?.contact_id ?? null;
  }

  const contactCandidate = input.contact?.trim();
  if (contactCandidate && UUID_PATTERN.test(contactCandidate)) {
    const { data: contactRow } = await supabase
      .from("contacts")
      .select("id")
      .eq("business_id", businessId)
      .eq("id", contactCandidate)
      .maybeSingle();

    if (contactRow?.id) {
      activeContactId = contactRow.id;
    }
  }

  const showProfilePanel =
    input.profile === "1" && activeContactId !== null;

  const filters = {
    searchQuery,
    stageFilter: activeStageFilter,
    statusFilter: activeStatusFilter,
  };

  const { data: kanbanRows } = await buildDealsQuery(
    supabase,
    businessId,
    filters,
  ).limit(500);

  const kanbanDeals = await mapDealQueryRows((kanbanRows ?? []) as DealQueryRow[]);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: listRows, count } = await buildDealsQuery(
    supabase,
    businessId,
    filters,
  ).range(from, to);

  const deals = await mapDealQueryRows((listRows ?? []) as DealQueryRow[]);
  const total = count ?? deals.length;

  return {
    hasBusiness: true,
    deals,
    kanbanDeals,
    total,
    activeTab: "deals",
    activeDealId,
    activeContactId,
    showProfilePanel,
    searchQuery,
    activeStageFilter,
    activeStatusFilter,
    activeView,
    page,
    pageSize,
    hasMore: from + deals.length < total,
  };
}

export async function listCrmDealsForContact(
  contactId: string,
): Promise<CrmDealItem[]> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_deals")
    .select(
      "id, contact_id, title, value, currency, stage, expected_close_date, status, is_primary, notes, created_at",
    )
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapCrmDeal);
}

export async function createCrmDeal(
  input: CreateCrmDealInput,
): Promise<CrmDealActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.dealSaveFailed },
    };
  }

  const parsed = createCrmDealSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.dealSaveFailed,
      },
    };
  }

  const stage = parsed.data.stage ?? "new";
  const supabase = await createClient();

  if (parsed.data.isPrimary) {
    await supabase
      .from("crm_deals")
      .update({ is_primary: false })
      .eq("business_id", businessId)
      .eq("contact_id", parsed.data.contactId)
      .eq("is_primary", true);
  }

  const { data, error } = await supabase
    .from("crm_deals")
    .insert({
      business_id: businessId,
      contact_id: parsed.data.contactId,
      title: parsed.data.title.trim(),
      value: parsed.data.value ?? null,
      currency: normalizeDealCurrency(parsed.data.currency),
      stage,
      expected_close_date: parsed.data.expectedCloseDate?.trim() || null,
      status: mapDealStatus(stage),
      notes: parsed.data.notes?.trim() || null,
      is_primary: parsed.data.isPrimary ?? false,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: { code: "INSERT_FAILED", message: CONTACTS_MESSAGES.dealSaveFailed },
    };
  }

  if (parsed.data.isPrimary) {
    await syncPrimaryDealToContact(parsed.data.contactId, businessId);
  }

  revalidatePath(DASHBOARD_ROUTES.contacts);

  return { success: true, data: { dealId: data.id } };
}

export async function updateCrmDeal(
  input: UpdateCrmDealInput,
): Promise<CrmDealActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.dealSaveFailed },
    };
  }

  const parsed = updateCrmDealSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.dealSaveFailed,
      },
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("crm_deals")
    .select("contact_id, is_primary")
    .eq("id", parsed.data.dealId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CONTACTS_MESSAGES.dealSaveFailed },
    };
  }

  if (parsed.data.isPrimary) {
    await supabase
      .from("crm_deals")
      .update({ is_primary: false })
      .eq("business_id", businessId)
      .eq("contact_id", existing.contact_id)
      .eq("is_primary", true);
  }

  const stage = parsed.data.stage;
  const { error } = await supabase
    .from("crm_deals")
    .update({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.value !== undefined ? { value: parsed.data.value } : {}),
      ...(parsed.data.currency !== undefined
        ? { currency: normalizeDealCurrency(parsed.data.currency) }
        : {}),
      ...(stage !== undefined ? { stage } : {}),
      ...(parsed.data.expectedCloseDate !== undefined
        ? { expected_close_date: parsed.data.expectedCloseDate?.trim() || null }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.notes !== undefined
        ? { notes: parsed.data.notes?.trim() || null }
        : {}),
      ...(parsed.data.isPrimary !== undefined
        ? { is_primary: parsed.data.isPrimary }
        : {}),
      ...(stage !== undefined ? { status: mapDealStatus(stage) } : {}),
    })
    .eq("id", parsed.data.dealId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CONTACTS_MESSAGES.dealSaveFailed },
    };
  }

  if (existing.is_primary || parsed.data.isPrimary) {
    await syncPrimaryDealToContact(existing.contact_id, businessId);
  }

  revalidatePath(DASHBOARD_ROUTES.contacts);

  return { success: true };
}

export async function deleteCrmDeal(
  input: DeleteCrmDealInput,
): Promise<CrmDealActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.dealDeleteFailed },
    };
  }

  const parsed = deleteCrmDealSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.dealDeleteFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .delete()
    .eq("id", parsed.data.dealId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "DELETE_FAILED", message: CONTACTS_MESSAGES.dealDeleteFailed },
    };
  }

  revalidatePath(DASHBOARD_ROUTES.contacts);

  return { success: true };
}
