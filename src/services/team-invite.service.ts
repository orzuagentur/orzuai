import "server-only";

import { randomBytes } from "node:crypto";

import { AUTH_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  getEnabledPermissionLabels,
  getRoleDescription,
} from "@/features/team/onboarding-content";
import {
  parseStoredPermissions,
  resolveMemberPermissions,
  roleLabel,
} from "@/features/team/permissions";
import type { TeamRole } from "@/features/team/types";
import { getAppUrl, hasResendEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTeamInviteEmail } from "@/services/email.service";

const INVITE_TOKEN_BYTES = 32;

export type TeamInviteRecord = {
  id: string;
  businessId: string;
  businessName: string;
  invitedEmail: string;
  role: TeamRole;
  inviteExpiresAt: string;
  permissions: ReturnType<typeof resolveMemberPermissions>;
};

function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

function buildTeamInviteAcceptPath(token: string): string {
  return `${AUTH_ROUTES.teamInviteAccept}?token=${encodeURIComponent(token)}`;
}

function buildPostAuthTeamOnboardingPath(token: string): string {
  return `${DASHBOARD_ROUTES.teamOnboarding}?token=${encodeURIComponent(token)}`;
}

export function clampInviteExpiryDays(value: number): number {
  return Math.min(7, Math.max(1, Math.round(value)));
}

export async function getTeamInviteByToken(
  token: string,
): Promise<TeamInviteRecord | null> {
  if (!hasSupabaseEnv() || !token.trim()) {
    return null;
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("business_members")
    .select(
      "id, business_id, invited_email, role, status, permissions, invite_expires_at, businesses ( business_name )",
    )
    .eq("invite_token", token)
    .eq("status", "invited")
    .maybeSingle();

  if (!member?.invite_expires_at) {
    return null;
  }

  if (new Date(member.invite_expires_at).getTime() < Date.now()) {
    return null;
  }

  const businessJoin = member.businesses as { business_name: string } | null;
  const role = member.role as TeamRole;

  return {
    id: member.id,
    businessId: member.business_id,
    businessName: businessJoin?.business_name ?? "Workspace",
    invitedEmail: member.invited_email,
    role,
    inviteExpiresAt: member.invite_expires_at,
    permissions: resolveMemberPermissions(
      role,
      parseStoredPermissions(member.permissions),
    ),
  };
}

async function createAuthLinkForInvite(
  email: string,
  inviteToken: string,
): Promise<string> {
  const admin = createAdminClient();
  const redirectTo = `${getAppUrl()}${AUTH_ROUTES.confirm}?next=${encodeURIComponent(buildPostAuthTeamOnboardingPath(inviteToken))}`;

  const inviteAttempt = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });

  if (!inviteAttempt.error && inviteAttempt.data.properties.action_link) {
    return inviteAttempt.data.properties.action_link;
  }

  const magicAttempt = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (magicAttempt.error || !magicAttempt.data.properties.action_link) {
    throw new Error(
      magicAttempt.error?.message ??
        inviteAttempt.error?.message ??
        "Unable to create sign-in link.",
    );
  }

  return magicAttempt.data.properties.action_link;
}

export async function sendTeamMemberInvite(input: {
  businessId: string;
  businessName: string;
  memberId: string;
  email: string;
  role: TeamRole;
  permissions: ReturnType<typeof resolveMemberPermissions>;
  inviteExpiryDays: number;
  inviterName?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  if (!hasResendEnv()) {
    return { success: false, message: "Email service is not configured." };
  }

  const admin = createAdminClient();
  const inviteToken = generateInviteToken();
  const expiryDays = clampInviteExpiryDays(input.inviteExpiryDays);
  const inviteExpiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const invitedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from("business_members")
    .update({
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
      invited_at: invitedAt,
    })
    .eq("id", input.memberId)
    .eq("business_id", input.businessId)
    .eq("status", "invited");

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  try {
    const authLink = await createAuthLinkForInvite(input.email, inviteToken);
    const acceptUrl = `${getAppUrl()}${buildTeamInviteAcceptPath(inviteToken)}`;

    const emailResult = await sendTeamInviteEmail({
      to: input.email,
      businessName: input.businessName,
      inviterName: input.inviterName,
      roleLabel: roleLabel(input.role),
      roleDescription: getRoleDescription(input.role),
      permissionLabels: getEnabledPermissionLabels(input.permissions),
      acceptUrl,
      authLink,
      expiresAt: inviteExpiresAt,
      expiryDays,
    });

    if (!emailResult.success) {
      return { success: false, message: emailResult.error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to send invitation.",
    };
  }
}

export async function activateTeamInviteForUser(input: {
  userId: string;
  email: string;
  inviteToken: string;
}): Promise<{
  success: boolean;
  message?: string;
  role?: TeamRole;
  businessId?: string;
}> {
  const invite = await getTeamInviteByToken(input.inviteToken);

  if (!invite) {
    return { success: false, message: "Invitation is invalid or has expired." };
  }

  if (invite.invitedEmail.toLowerCase() !== input.email.trim().toLowerCase()) {
    return {
      success: false,
      message: "Sign in with the email address that received the invitation.",
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("business_members")
    .update({
      user_id: input.userId,
      status: "active",
      accepted_at: now,
      invite_token: null,
      invite_expires_at: null,
    })
    .eq("id", invite.id)
    .eq("business_id", invite.businessId)
    .eq("status", "invited");

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    role: invite.role,
    businessId: invite.businessId,
  };
}

export async function completeTeamMemberOnboarding(
  userId: string,
): Promise<{ success: boolean }> {
  if (!hasSupabaseEnv()) {
    return { success: false };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("business_members")
    .update({ team_onboarding_completed_at: now })
    .eq("user_id", userId)
    .eq("status", "active")
    .is("team_onboarding_completed_at", null);

  return { success: !error };
}

export async function getPendingTeamOnboardingForUser(userId: string): Promise<{
  needsOnboarding: boolean;
  role: TeamRole | null;
  businessName: string | null;
}> {
  if (!hasSupabaseEnv()) {
    return { needsOnboarding: false, role: null, businessName: null };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_members")
    .select("role, team_onboarding_completed_at, businesses ( business_name )")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("team_onboarding_completed_at", null)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { needsOnboarding: false, role: null, businessName: null };
  }

  const businessJoin = data.businesses as { business_name: string } | null;

  return {
    needsOnboarding: true,
    role: data.role as TeamRole,
    businessName: businessJoin?.business_name ?? null,
  };
}

export async function resolveTeamInviteAuthUrl(
  token: string,
): Promise<string | null> {
  const invite = await getTeamInviteByToken(token);

  if (!invite) {
    return null;
  }

  try {
    return await createAuthLinkForInvite(invite.invitedEmail, token);
  } catch {
    return null;
  }
}

export function buildTeamInviteAuthRedirectUrl(inviteToken: string): string {
  return `${getAppUrl()}${buildTeamInviteAcceptPath(inviteToken)}`;
}
