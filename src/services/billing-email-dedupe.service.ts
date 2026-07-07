import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";

export async function hasBillingEmailBeenSent(dedupeKey: string): Promise<boolean> {
  if (!dedupeKey.trim() || !hasSupabaseEnv()) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_send_log")
    .select("id")
    .eq("metadata->>dedupeKey", dedupeKey.trim())
    .in("status", ["sent", "delivered"])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[billing-email-dedupe] lookup failed", error.message);
    return false;
  }

  return Boolean(data?.id);
}
