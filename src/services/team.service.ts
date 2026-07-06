import "server-only";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  canAssignRole,
  canRemoveMember,
  isAccessWindowActive,
  parseStoredPermissions,
  resolveMemberPermissions,
  serializePermissions,
} from "@/features/team/permissions";
import type {
  TeamMemberRecord,
  TeamMemberStatus,
  TeamPageData,
  TeamPermissions,
  TeamRole,
} from "@/features/team/types";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { sendTeamMemberInvite } from "@/services/team-invite.service";
import { getBusinessEntitlements } from "@/services/entitlement.service";

type BusinessMemberRow = {
  id: string;
  invited_email: string;
  role: string;
  status: string;
  permissions: unknown;
  access_starts_at: string | null;
  access_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

function revalidateTeamPaths() {
  revalidatePath(DASHBOARD_ROUTES.team);
  revalidatePath(DASHBOARD_ROUTES.settings);
}

function parseTeamRole(value: string): TeamRole {
  if (
    value === "owner" ||
    value === "admin" ||
    value === "manager" ||
    value === "agent" ||
    value === "viewer"
  ) {
    return value;
  }

  return "agent";
}

function parseTeamStatus(value: string): TeamMemberStatus {
  if (value === "active" || value === "invited" || value === "removed") {
    return value;
  }

  return "invited";
}

function mapMemberRow(member: BusinessMemberRow): TeamMemberRecord {
  const role = parseTeamRole(member.role);
  const overrides = parseStoredPermissions(member.permissions);

  return {
    id: member.id,
    email: member.invited_email,
    role,
    status: parseTeamStatus(member.status),
    isOwner: false,
    permissions: resolveMemberPermissions(role, overrides),
    accessStartsAt: member.access_starts_at,
    accessEndsAt: member.access_ends_at,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
  };
}

function countUsedSeats(members: TeamMemberRecord[]): number {
  return members.filter((member) => member.status !== "removed").length;
}

export async function listTeamMembers(businessId: string): Promise<TeamMemberRecord[]> {
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
    .select(
      "id, invited_email, role, status, permissions, access_starts_at, access_ends_at, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });

  const items: TeamMemberRecord[] = [];

  if (business) {
    const { data: ownerUser } = await admin.auth.admin.getUserById(business.user_id);
    items.push({
      id: "owner",
      email: ownerUser.user?.email ?? business.email ?? "owner",
      role: "owner",
      status: "active",
      isOwner: true,
      permissions: resolveMemberPermissions("owner", null),
      accessStartsAt: null,
      accessEndsAt: null,
      createdAt: "",
      updatedAt: "",
    });
  }

  for (const member of (members ?? []) as BusinessMemberRow[]) {
    items.push(mapMemberRow(member));
  }

  return items;
}

export async function getTeamPageData(): Promise<TeamPageData> {
  const user = await requireUser().catch(() => null);
  const business = user ? await getPrimaryBusiness(user.id) : null;

  if (!business || !hasSupabaseEnv()) {
    return {
      hasBusiness: false,
      canManageTeam: false,
      members: [],
      maxTeamSeats: 1,
      usedSeats: 0,
      planLabel: "Free",
      pendingInvites: 0,
      activeMembers: 0,
    };
  }

  const [members, entitlements] = await Promise.all([
    listTeamMembers(business.id),
    getBusinessEntitlements(business.id),
  ]);

  const usedSeats = countUsedSeats(members);
  const pendingInvites = members.filter((member) => member.status === "invited").length;
  const activeMembers = members.filter(
    (member) =>
      member.status === "active" &&
      (member.isOwner || isAccessWindowActive(member.accessStartsAt, member.accessEndsAt)),
  ).length;

  return {
    hasBusiness: true,
    canManageTeam: true,
    members,
    maxTeamSeats: entitlements.entitlements.maxTeamSeats,
    usedSeats,
    planLabel: entitlements.planLabel,
    pendingInvites,
    activeMembers,
  };
}

export async function inviteTeamMember(input: {
  email: string;
  role: TeamRole;
  permissions?: TeamPermissions;
  accessStartsAt?: string | null;
  accessEndsAt?: string | null;
  inviteExpiryDays?: number;
}): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  if (input.role === "owner") {
    return { success: false, message: "Owner role cannot be assigned." };
  }

  const [members, entitlements] = await Promise.all([
    listTeamMembers(business.id),
    getBusinessEntitlements(business.id),
  ]);

  if (countUsedSeats(members) >= entitlements.entitlements.maxTeamSeats) {
    return {
      success: false,
      message: "Your plan has no available team seats. Upgrade billing to add more members.",
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  if (members.some((member) => member.email.toLowerCase() === normalizedEmail)) {
    return { success: false, message: "This email is already on the team." };
  }

  const permissions = serializePermissions(
    input.permissions ?? resolveMemberPermissions(input.role, null),
    input.role,
  );

  const admin = createAdminClient();
  const { data: memberRow, error } = await admin
    .from("business_members")
    .upsert(
      {
        business_id: business.id,
        invited_email: normalizedEmail,
        role: input.role,
        status: "invited",
        permissions,
        access_starts_at: input.accessStartsAt ?? null,
        access_ends_at: input.accessEndsAt ?? null,
        user_id: null,
        accepted_at: null,
        team_onboarding_completed_at: null,
      },
      { onConflict: "business_id,invited_email" },
    )
    .select("id")
    .single();

  if (error || !memberRow) {
    return { success: false, message: error?.message ?? "Unable to save invite." };
  }

  const inviterName =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === "string" &&
      user.user_metadata.name.trim()) ||
    user.email ||
    null;

  const inviteResult = await sendTeamMemberInvite({
    businessId: business.id,
    businessName: business.business_name,
    memberId: memberRow.id,
    email: normalizedEmail,
    role: input.role,
    permissions: resolveMemberPermissions(input.role, permissions),
    inviteExpiryDays: input.inviteExpiryDays ?? 7,
    inviterName,
  });

  if (!inviteResult.success) {
    return inviteResult;
  }

  revalidateTeamPaths();
  return { success: true };
}

export async function updateTeamMember(input: {
  memberId: string;
  role?: TeamRole;
  permissions?: TeamPermissions;
  accessStartsAt?: string | null;
  accessEndsAt?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  if (input.memberId === "owner") {
    return { success: false, message: "Owner settings cannot be changed here." };
  }

  const members = await listTeamMembers(business.id);
  const member = members.find((item) => item.id === input.memberId);

  if (!member || member.isOwner) {
    return { success: false, message: "Member not found." };
  }

  const nextRole = input.role ?? member.role;

  if (!canAssignRole("owner", nextRole) && nextRole !== member.role) {
    return { success: false, message: "You cannot assign this role." };
  }

  const permissions = serializePermissions(
    input.permissions ?? member.permissions,
    nextRole,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_members")
    .update({
      role: nextRole,
      permissions,
      access_starts_at:
        input.accessStartsAt === undefined
          ? member.accessStartsAt
          : input.accessStartsAt,
      access_ends_at:
        input.accessEndsAt === undefined ? member.accessEndsAt : input.accessEndsAt,
    })
    .eq("id", input.memberId)
    .eq("business_id", business.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateTeamPaths();
  return { success: true };
}

export async function removeTeamMember(
  memberId: string,
): Promise<{ success: boolean; message?: string }> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || !hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const members = await listTeamMembers(business.id);
  const member = members.find((item) => item.id === memberId);

  if (!member) {
    return { success: false, message: "Member not found." };
  }

  if (!canRemoveMember("owner", member)) {
    return { success: false, message: "You cannot remove this member." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("business_id", business.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateTeamPaths();
  return { success: true };
}

// Backward-compatible alias used by settings imports.
export type { TeamMemberRecord as TeamMemberItem };
