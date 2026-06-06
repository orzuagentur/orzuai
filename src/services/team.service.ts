import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";

export type TeamMemberItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  isOwner: boolean;
};

export async function listTeamMembers(businessId: string): Promise<TeamMemberItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("user_id, email")
    .eq("id", businessId)
    .maybeSingle();

  const { data: members } = await admin
    .from("business_members")
    .select("id, invited_email, role, status, user_id")
    .eq("business_id", businessId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });

  const items: TeamMemberItem[] = [];

  if (business) {
    const { data: ownerUser } = await admin.auth.admin.getUserById(business.user_id);
    items.push({
      id: "owner",
      email: ownerUser.user?.email ?? business.email ?? "owner",
      role: "owner",
      status: "active",
      isOwner: true,
    });
  }

  for (const member of members ?? []) {
    items.push({
      id: member.id,
      email: member.invited_email,
      role: member.role,
      status: member.status,
      isOwner: false,
    });
  }

  return items;
}

export async function inviteTeamMember(input: {
  email: string;
  role: string;
}): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("business_members").upsert(
    {
      business_id: business.id,
      invited_email: input.email.trim().toLowerCase(),
      role: input.role,
      status: "invited",
    },
    { onConflict: "business_id,invited_email" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(DASHBOARD_ROUTES.settings);
  return { success: true };
}
