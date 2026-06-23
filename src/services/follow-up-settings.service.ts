import "server-only";

import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type FollowUpAgentSettings = {
  enabled: boolean;
  sentCount: number;
};

export type SaveFollowUpAgentInput = {
  enabled: boolean;
};

export async function getFollowUpAgentSettings(
  businessId: string,
): Promise<FollowUpAgentSettings> {
  if (!hasSupabaseEnv()) {
    return { enabled: true, sentCount: 0 };
  }

  const admin = createAdminClient();
  const [configResult, countResult] = await Promise.all([
    admin
      .from("business_ai_config")
      .select("follow_up_agent_enabled")
      .eq("business_id", businessId)
      .maybeSingle(),
    admin
      .from("conversation_follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
  ]);

  return {
    enabled: configResult.data?.follow_up_agent_enabled ?? true,
    sentCount: countResult.count ?? 0,
  };
}

export async function saveFollowUpAgentSettings(
  businessId: string,
  input: SaveFollowUpAgentInput,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = createAdminClient();

  const payload: {
    business_id: string;
    follow_up_agent_enabled: boolean;
  } = {
    business_id: businessId,
    follow_up_agent_enabled: input.enabled,
  };

  const { error } = await admin
    .from("business_ai_config")
    .upsert(payload, { onConflict: "business_id" });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}
