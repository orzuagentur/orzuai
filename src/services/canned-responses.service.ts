import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CANNED_RESPONSES_MESSAGES } from "@/features/canned-responses/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import type {
  CannedResponseActionResult,
  CannedResponseItem,
  CreateCannedResponseInput,
  DeleteCannedResponseInput,
  UpdateCannedResponseInput,
} from "@/types/canned-response.types";
import {
  createCannedResponseSchema,
  deleteCannedResponseSchema,
  updateCannedResponseSchema,
} from "@/types/canned-response.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { MessagingChannel } from "@/types/database.types";
import { isInboxMessagingChannel } from "@/features/integrations/constants";

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function revalidateCannedResponsePaths(): void {
  revalidatePath(DASHBOARD_ROUTES.settings);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

function mapCannedResponse(row: {
  id: string;
  title: string;
  content: string;
  channel: MessagingChannel | null;
  created_at: string;
  updated_at: string;
}): CannedResponseItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    channel:
      row.channel && isInboxMessagingChannel(row.channel) ? row.channel : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCannedResponses(
  channel?: MessagingIntegrationChannelId,
): Promise<CannedResponseItem[]> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createClient();
  let query = supabase
    .from("canned_responses")
    .select("id, title, content, channel, created_at, updated_at")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  if (channel) {
    query = query.or(`channel.eq.${channel},channel.is.null`);
  }

  const { data } = await query;
  return (data ?? []).map(mapCannedResponse);
}

export async function createCannedResponse(
  input: CreateCannedResponseInput,
): Promise<CannedResponseActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CANNED_RESPONSES_MESSAGES.saveFailed },
    };
  }

  const parsed = createCannedResponseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CANNED_RESPONSES_MESSAGES.saveFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("canned_responses").insert({
    business_id: businessId,
    title: parsed.data.title,
    content: parsed.data.content,
    channel: parsed.data.channel ?? null,
  });

  if (error) {
    return {
      success: false,
      error: { code: "CREATE_FAILED", message: CANNED_RESPONSES_MESSAGES.saveFailed },
    };
  }

  revalidateCannedResponsePaths();
  return { success: true };
}

export async function updateCannedResponse(
  input: UpdateCannedResponseInput,
): Promise<CannedResponseActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CANNED_RESPONSES_MESSAGES.saveFailed },
    };
  }

  const parsed = updateCannedResponseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CANNED_RESPONSES_MESSAGES.saveFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("canned_responses")
    .update({
      title: parsed.data.title,
      content: parsed.data.content,
      channel: parsed.data.channel ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: CANNED_RESPONSES_MESSAGES.saveFailed },
    };
  }

  revalidateCannedResponsePaths();
  return { success: true };
}

export async function deleteCannedResponse(
  input: DeleteCannedResponseInput,
): Promise<CannedResponseActionResult> {
  const businessId = await getOwnedBusinessId();

  if (!businessId || !hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CANNED_RESPONSES_MESSAGES.deleteFailed },
    };
  }

  const parsed = deleteCannedResponseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? CANNED_RESPONSES_MESSAGES.deleteFailed,
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("canned_responses")
    .delete()
    .eq("id", parsed.data.id)
    .eq("business_id", businessId);

  if (error) {
    return {
      success: false,
      error: { code: "DELETE_FAILED", message: CANNED_RESPONSES_MESSAGES.deleteFailed },
    };
  }

  revalidateCannedResponsePaths();
  return { success: true };
}
