import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ORDERS_MESSAGES, readOrderPayloadString } from "@/features/orders/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  CreateCrmOrderInput,
  CreateManualCrmOrderInput,
  CrmOrderActionResult,
  CrmOrderListItem,
  CrmOrderPayload,
  CrmOrderSource,
  CrmOrdersPageData,
  CrmOrderStatus,
  UpdateCrmOrderStatusInput,
} from "@/types/crm-order.types";
import {
  CRM_ORDER_SOURCES,
  CRM_ORDER_STATUSES,
  createManualCrmOrderSchema,
  updateCrmOrderStatusSchema,
} from "@/types/crm-order.types";
import type { MessagingChannel } from "@/types/database.types";

type OrderRow = {
  id: string;
  contact_id: string | null;
  conversation_id: string | null;
  title: string;
  description: string | null;
  source: string;
  status: string;
  amount: number | string | null;
  currency: string;
  payload: CrmOrderPayload | null;
  created_at: string;
  updated_at: string;
  contacts?:
    | {
        name: string | null;
        phone_number: string | null;
        email: string | null;
        channel: MessagingChannel | null;
      }
    | Array<{
        name: string | null;
        phone_number: string | null;
        email: string | null;
        channel: MessagingChannel | null;
      }>
    | null;
};

function isOrderStatus(value: string | null | undefined): value is CrmOrderStatus {
  return CRM_ORDER_STATUSES.includes(value as CrmOrderStatus);
}

function isOrderSource(value: string | null | undefined): value is CrmOrderSource {
  return CRM_ORDER_SOURCES.includes(value as CrmOrderSource);
}

function resolveContact(
  contact: OrderRow["contacts"],
): {
  name: string | null;
  phone: string | null;
  email: string | null;
  channel: MessagingChannel | null;
} {
  const row = Array.isArray(contact) ? (contact[0] ?? null) : contact;
  return {
    name: row?.name ?? null,
    phone: row?.phone_number ?? null,
    email: row?.email ?? null,
    channel: row?.channel ?? null,
  };
}

function mapOrder(row: OrderRow): CrmOrderListItem {
  const contact = resolveContact(row.contacts);
  const payload = row.payload ?? {};
  const serviceType =
    readOrderPayloadString(payload, "serviceType") ??
    readOrderPayloadString(payload, "service_type");
  const payloadName = readOrderPayloadString(payload, "customerName");
  const payloadPhone =
    readOrderPayloadString(payload, "phone") ?? contact.phone;
  const payloadEmail =
    readOrderPayloadString(payload, "email") ?? contact.email;

  return {
    id: row.id,
    contactId: row.contact_id,
    conversationId: row.conversation_id,
    title: row.title,
    description: row.description,
    source: isOrderSource(row.source) ? row.source : "manual",
    status: isOrderStatus(row.status) ? row.status : "new",
    amount:
      row.amount === null || row.amount === undefined
        ? null
        : Number(row.amount),
    currency: row.currency || "EUR",
    payload,
    serviceType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contactName: contact.name,
    contactPhone: payloadPhone,
    contactEmail: payloadEmail,
    contactChannel: contact.channel,
    customerDisplayName:
      contact.name?.trim() ||
      payloadName ||
      ORDERS_MESSAGES.noContact,
  };
}

export async function createCrmOrder(
  input: CreateCrmOrderInput,
): Promise<{ success: true; orderId: string } | { success: false; message: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, message: "Title is required." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_orders")
    .insert({
      business_id: input.businessId,
      contact_id: input.contactId ?? null,
      conversation_id: input.conversationId ?? null,
      title,
      description: input.description?.trim() || null,
      source: input.source,
      status: "new",
      amount: input.amount ?? null,
      currency: input.currency ?? "EUR",
      payload: input.payload ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, message: error?.message ?? "Unable to create order." };
  }

  revalidatePath(DASHBOARD_ROUTES.orders);
  return { success: true, orderId: data.id };
}

export async function createManualCrmOrder(
  input: CreateManualCrmOrderInput,
): Promise<CrmOrderActionResult> {
  const parsed = createManualCrmOrderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? ORDERS_MESSAGES.createFailed,
      },
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "CONFIG", message: ORDERS_MESSAGES.createFailed },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: ORDERS_MESSAGES.createFailed },
    };
  }

  const data = parsed.data;
  const email = data.email?.trim() || null;
  const phone = data.phone?.trim() || null;
  const serviceType = data.serviceType?.trim() || null;
  const source = data.source ?? "manual";

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("crm_orders")
    .insert({
      business_id: business.id,
      contact_id: data.contactId ?? null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      source,
      status: "new",
      amount: data.amount ?? null,
      currency: "EUR",
      payload: {
        customerName: data.customerName.trim(),
        phone,
        email,
        serviceType,
      },
    })
    .select("id")
    .single();

  if (error || !row) {
    return {
      success: false,
      error: {
        code: "INSERT_FAILED",
        message: error?.message ?? ORDERS_MESSAGES.createFailed,
      },
    };
  }

  revalidatePath(DASHBOARD_ROUTES.orders);
  return { success: true, data: { orderId: row.id } };
}

export async function getCrmOrdersPageData(input?: {
  status?: string | null;
  q?: string | null;
  orderId?: string | null;
}): Promise<CrmOrdersPageData> {
  const empty: CrmOrdersPageData = {
    hasBusiness: false,
    orders: [],
    total: 0,
    activeStatus: "all",
    searchQuery: "",
    activeOrderId: null,
  };

  if (!hasSupabaseEnv()) {
    return empty;
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return empty;
  }

  const supabase = await createClient();
  const searchQuery = input?.q?.trim() ?? "";
  const activeStatus = isOrderStatus(input?.status) ? input.status! : "all";
  const activeOrderId = input?.orderId?.trim() || null;

  let query = supabase
    .from("crm_orders")
    .select(
      "id, contact_id, conversation_id, title, description, source, status, amount, currency, payload, created_at, updated_at, contacts(name, phone_number, email, channel)",
      { count: "exact" },
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  if (searchQuery) {
    const pattern = `%${searchQuery.replace(/[%_\\]/g, "\\$&")}%`;
    query = query.or(
      `title.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;

  if (error) {
    return {
      hasBusiness: true,
      orders: [],
      total: 0,
      activeStatus,
      searchQuery,
      activeOrderId,
    };
  }

  const orders = ((data ?? []) as OrderRow[]).map(mapOrder);

  return {
    hasBusiness: true,
    orders,
    total: count ?? 0,
    activeStatus,
    searchQuery,
    activeOrderId:
      activeOrderId && orders.some((order) => order.id === activeOrderId)
        ? activeOrderId
        : null,
  };
}

export async function updateCrmOrderStatus(
  input: UpdateCrmOrderStatusInput,
): Promise<CrmOrderActionResult> {
  const parsed = updateCrmOrderStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: ORDERS_MESSAGES.updateFailed },
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "CONFIG", message: ORDERS_MESSAGES.updateFailed },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      success: false,
      error: { code: "NO_BUSINESS", message: ORDERS_MESSAGES.updateFailed },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .eq("business_id", business.id);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: error.message },
    };
  }

  revalidatePath(DASHBOARD_ROUTES.orders);
  return { success: true };
}
