import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type { AutomationItem, SaveAutomationInput } from "@/types/automations.types";
import { saveAutomationSchema } from "@/types/automations.types";

export async function listAutomations(
  businessId: string,
): Promise<AutomationItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("automations")
    .select("id, name, trigger_type, action_type, enabled, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (
    data?.map((row) => ({
      id: row.id,
      name: row.name,
      triggerType: row.trigger_type,
      actionType: row.action_type,
      enabled: row.enabled,
      createdAt: row.created_at,
    })) ?? []
  );
}

export async function getAutomationsPageData() {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return { hasBusiness: false, automations: [] as AutomationItem[] };
  }

  const automations = await listAutomations(business.id);
  return { hasBusiness: true, automations };
}

export async function createAutomation(
  input: SaveAutomationInput,
): Promise<{ success: boolean; message?: string }> {
  const parsed = saveAutomationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid automation.",
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("automations").insert({
    business_id: business.id,
    name: parsed.data.name,
    trigger_type: parsed.data.triggerType,
    action_type: parsed.data.actionType,
    enabled: parsed.data.enabled ?? true,
    config: {},
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.automations);
  return { success: true };
}

export async function toggleAutomation(
  automationId: string,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .update({ enabled })
    .eq("id", automationId)
    .eq("business_id", business.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.automations);
  return { success: true };
}

export async function deleteAutomation(
  automationId: string,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("id", automationId)
    .eq("business_id", business.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.automations);
  return { success: true };
}
