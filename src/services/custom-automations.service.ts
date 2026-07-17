import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import {
  parseAutomationConfig,
  saveAutomationWorkflowSchema,
  type AutomationWorkflowItem,
  type SaveAutomationWorkflowInput,
} from "@/features/automations/workflow-types";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { assertCanCreateAutomation } from "@/services/entitlement.service";

function mapWorkflowRow(row: {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  enabled: boolean;
  config: unknown;
  created_at: string;
  updated_at: string;
}): AutomationWorkflowItem {
  return {
    id: row.id,
    name: row.name,
    triggerType: row.trigger_type as AutomationWorkflowItem["triggerType"],
    actionType: row.action_type as AutomationWorkflowItem["actionType"],
    enabled: row.enabled,
    config: parseAutomationConfig(row.config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCustomAutomations(
  businessId: string,
): Promise<AutomationWorkflowItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("automations")
    .select(
      "id, name, trigger_type, action_type, enabled, config, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapWorkflowRow);
}

export async function getCustomAutomation(
  businessId: string,
  automationId: string,
): Promise<AutomationWorkflowItem | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("automations")
    .select(
      "id, name, trigger_type, action_type, enabled, config, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .eq("id", automationId)
    .maybeSingle();

  return data ? mapWorkflowRow(data) : null;
}

export async function createCustomAutomation(
  input: SaveAutomationWorkflowInput,
): Promise<{ success: boolean; message?: string; id?: string }> {
  const parsed = saveAutomationWorkflowSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? AUTOMATIONS_MESSAGES.saveFailed,
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: AUTOMATIONS_MESSAGES.noBusiness };
  }

  const automationLimit = await assertCanCreateAutomation(business.id);
  if (!automationLimit.allowed) {
    return { success: false, message: automationLimit.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automations")
    .insert({
      business_id: business.id,
      name: parsed.data.name,
      trigger_type: parsed.data.triggerType,
      action_type: parsed.data.actionType,
      enabled: parsed.data.enabled ?? true,
      config: parsed.data.config ?? { channels: [] },
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.overview);
  return { success: true, id: data.id };
}

export async function toggleCustomAutomation(
  automationId: string,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: AUTOMATIONS_MESSAGES.noBusiness };
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

  revalidatePath(DASHBOARD_ROUTES.overview);
  return { success: true };
}

export async function deleteCustomAutomation(
  automationId: string,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: AUTOMATIONS_MESSAGES.noBusiness };
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

  revalidatePath(DASHBOARD_ROUTES.overview);
  return { success: true };
}
