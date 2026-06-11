import "server-only";

import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  CreateCrmTaskInput,
  CrmTaskActionResult,
  CrmTaskItem,
  DeleteCrmTaskInput,
  UpdateCrmTaskStatusInput,
} from "@/types/crm-task.types";
import {
  createCrmTaskSchema,
  deleteCrmTaskSchema,
  updateCrmTaskStatusSchema,
} from "@/types/crm-task.types";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function mapCrmTask(row: {
  id: string;
  contact_id: string;
  title: string;
  due_at: string | null;
  status: string;
  created_at: string;
}): CrmTaskItem {
  return {
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    dueAt: row.due_at,
    status: row.status === "done" ? "done" : "open",
    createdAt: row.created_at,
  };
}

export async function listCrmTasksForContact(
  contactId: string,
): Promise<CrmTaskItem[]> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_tasks")
    .select("id, contact_id, title, due_at, status, created_at")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(mapCrmTask);
}

export async function createCrmTask(
  input: CreateCrmTaskInput,
): Promise<CrmTaskActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.taskSaveFailed },
    };
  }

  const parsed = createCrmTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.taskSaveFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("crm_tasks").insert({
    business_id: businessId,
    contact_id: parsed.data.contactId,
    title: parsed.data.title,
    due_at: parsed.data.dueAt ?? null,
  });

  if (error) {
    return {
      success: false,
      error: { code: "CREATE_FAILED", message: CONTACTS_MESSAGES.taskSaveFailed },
    };
  }

  return { success: true };
}

export async function updateCrmTaskStatus(
  input: UpdateCrmTaskStatusInput,
): Promise<CrmTaskActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.taskSaveFailed },
    };
  }

  const parsed = updateCrmTaskStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.taskSaveFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.taskId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CONTACTS_MESSAGES.taskSaveFailed },
    };
  }

  return { success: true };
}

export async function deleteCrmTask(
  input: DeleteCrmTaskInput,
): Promise<CrmTaskActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CONTACTS_MESSAGES.taskDeleteFailed },
    };
  }

  const parsed = deleteCrmTaskSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CONTACTS_MESSAGES.taskDeleteFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tasks")
    .delete()
    .eq("id", parsed.data.taskId)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "DELETE_FAILED", message: CONTACTS_MESSAGES.taskDeleteFailed },
    };
  }

  return { success: true };
}
