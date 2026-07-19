import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  createDefaultOrderFormFields,
  fieldSupportsOptions,
  normalizeOrderFormOptions,
  orderFormFieldsSchema,
  parseOrderFormFields,
  type OrderFormField,
} from "@/features/orders/order-form-fields";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listKnowledgeEntries } from "@/services/knowledge.service";

export async function getOrderFormFieldsForBusiness(
  businessId: string,
): Promise<OrderFormField[]> {
  if (!hasSupabaseEnv()) {
    return createDefaultOrderFormFields();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("order_form_fields")
    .eq("id", businessId)
    .maybeSingle();

  return parseOrderFormFields(data?.order_form_fields);
}

export async function getOwnedOrderFormFields(): Promise<OrderFormField[]> {
  if (!hasSupabaseEnv()) {
    return createDefaultOrderFormFields();
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  if (!business) {
    return createDefaultOrderFormFields();
  }

  return getOrderFormFieldsForBusiness(business.id);
}

export async function saveOwnedOrderFormFields(
  fields: OrderFormField[],
): Promise<
  | { success: true; fields: OrderFormField[] }
  | { success: false; message: string }
> {
  const parsed = orderFormFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid field settings.",
    };
  }

  const normalizedFields = parsed.data.map((field) => {
    if (!fieldSupportsOptions(field)) {
      const { options: _removed, ...rest } = field;
      return rest;
    }
    const options = normalizeOrderFormOptions(field.options);
    return options.length > 0
      ? { ...field, options }
      : { ...field, options: undefined };
  });

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  if (!business) {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ order_form_fields: normalizedFields })
    .eq("id", business.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.orders);
  return { success: true, fields: normalizedFields };
}

export async function importOrderFormOptionsFromKnowledge(
  kind: "services" | "prices",
): Promise<
  | { success: true; options: string[]; importedCount: number }
  | { success: false; message: string }
> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  if (!business) {
    return { success: false, message: "Business not found." };
  }

  if (kind === "services") {
    const entries = await listKnowledgeEntries(business.id, {
      category: "Services",
    });
    const options = normalizeOrderFormOptions(
      entries.map((entry) => entry.title),
    );
    return {
      success: true,
      options,
      importedCount: options.length,
    };
  }

  const [services, pricing] = await Promise.all([
    listKnowledgeEntries(business.id, { category: "Services" }),
    listKnowledgeEntries(business.id, { category: "Pricing" }),
  ]);

  const priceValues: string[] = [];
  for (const entry of services) {
    const price = entry.metadata?.price?.trim();
    if (price) priceValues.push(price);
  }
  for (const entry of pricing) {
    const price = entry.metadata?.price?.trim();
    if (price) {
      priceValues.push(price);
    } else if (entry.title.trim()) {
      // Pricing rows sometimes store the rate in the title.
      priceValues.push(entry.title.trim());
    }
  }

  const options = normalizeOrderFormOptions(priceValues);
  return {
    success: true,
    options,
    importedCount: options.length,
  };
}
