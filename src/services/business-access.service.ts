import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import type { Business } from "@/types/database.types";

/** Owned business first, then first active team membership. */
export async function getAccessibleBusiness(
  userId: string,
): Promise<Business | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();

  const { data: owned } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) {
    return owned;
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.business_id) {
    return null;
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", membership.business_id)
    .maybeSingle();

  return business ?? null;
}

export async function userCanAccessBusiness(
  userId: string,
  businessId: string,
): Promise<boolean> {
  const business = await getAccessibleBusiness(userId);

  return business?.id === businessId;
}
