import "server-only";

import type { User } from "@supabase/supabase-js";

import { DEFAULT_SUBSCRIPTION_PLAN } from "@/features/dashboard/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DashboardUserProfile } from "@/types/dashboard.types";

export async function getUserProfile(
  authUser: User,
): Promise<DashboardUserProfile> {
  const email = authUser.email ?? "";

  if (!hasSupabaseEnv()) {
    return {
      id: authUser.id,
      email,
      fullName:
        (authUser.user_metadata?.full_name as string | undefined) ??
        (authUser.user_metadata?.name as string | undefined) ??
        null,
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
      plan: DEFAULT_SUBSCRIPTION_PLAN,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("full_name, avatar_url, email")
    .eq("id", authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: data?.email ?? email,
    fullName:
      data?.full_name ??
      (authUser.user_metadata?.full_name as string | undefined) ??
      (authUser.user_metadata?.name as string | undefined) ??
      null,
    avatarUrl:
      data?.avatar_url ??
      (authUser.user_metadata?.avatar_url as string | undefined) ??
      null,
    plan: DEFAULT_SUBSCRIPTION_PLAN,
  };
}
