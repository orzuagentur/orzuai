import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { PipelineStage } from "@/types/contact.types";
import type {
  CreateCrmDealInput,
  CrmDealActionResult,
  CrmDealItem,
  CrmDealStatus,
  DeleteCrmDealInput,
  UpdateCrmDealInput,
} from "@/types/crm-deal.types";
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

function revalidateDealPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.contacts);
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

function mapCrmDeal(row: {
  id: string;
  contact_id: string;
  title: string;
  value: number | null;
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
      "id, contact_id, title, value, stage, expected_close_date, status, is_primary, notes, created_at",
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

  revalidateDealPaths();
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

  revalidateDealPaths();
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

  revalidateDealPaths();
  return { success: true };
}
