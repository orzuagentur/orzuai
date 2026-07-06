import { redirect } from "next/navigation";

import { TeamMemberOnboarding } from "@/components/team/TeamMemberOnboarding";
import { AUTH_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import {
  TEAM_ROLE_ONBOARDING,
} from "@/features/team/onboarding-content";
import { getCurrentUser } from "@/services/auth.service";
import {
  activateTeamInviteForUser,
  getPendingTeamOnboardingForUser,
} from "@/services/team-invite.service";
import type { TeamRole } from "@/features/team/types";

type TeamOnboardingPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function TeamOnboardingPage({
  searchParams,
}: TeamOnboardingPageProps) {
  const user = await getCurrentUser();

  if (!user?.email) {
    redirect(AUTH_ROUTES.login);
  }

  const params = await searchParams;
  const inviteToken = params.token?.trim();

  let role: TeamRole | null = null;
  let businessName: string | null = null;

  if (inviteToken) {
    const activation = await activateTeamInviteForUser({
      userId: user.id,
      email: user.email,
      inviteToken,
    });

    if (activation.success && activation.role) {
      role = activation.role;
      const pending = await getPendingTeamOnboardingForUser(user.id);
      businessName = pending.businessName;
    }
  }

  if (!role) {
    const pending = await getPendingTeamOnboardingForUser(user.id);

    if (!pending.needsOnboarding || !pending.role) {
      redirect(DASHBOARD_ROUTES.overview);
    }

    role = pending.role;
    businessName = pending.businessName;
  }

  if (role === "owner") {
    redirect(DASHBOARD_ROUTES.overview);
  }

  const content = TEAM_ROLE_ONBOARDING[role];

  return (
    <TeamMemberOnboarding
      role={role}
      businessName={businessName}
      content={content}
    />
  );
}
