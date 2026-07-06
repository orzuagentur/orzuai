import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getPendingTeamOnboardingForUser } from "@/services/team-invite.service";
import { getPostAuthRedirectPath } from "@/utils/auth";

export function resolveAuthenticatedLandingPath(
  hasBusiness: boolean,
  next?: string | null,
): string {
  if (!hasBusiness) {
    return DASHBOARD_ROUTES.onboarding;
  }

  const redirectPath = getPostAuthRedirectPath(next);

  if (redirectPath === DASHBOARD_ROUTES.onboarding) {
    return DASHBOARD_ROUTES.onboarding;
  }

  return redirectPath || APP_ROUTES.dashboard;
}

export async function resolveAuthenticatedLandingPathForUser(
  userId: string,
  next?: string | null,
): Promise<string> {
  const [ownedBusiness, accessibleBusiness, pendingTeamOnboarding] =
    await Promise.all([
      getPrimaryBusiness(userId),
      getAccessibleBusiness(userId),
      getPendingTeamOnboardingForUser(userId),
    ]);

  if (pendingTeamOnboarding.needsOnboarding && !ownedBusiness) {
    return DASHBOARD_ROUTES.teamOnboarding;
  }

  const hasBusiness = Boolean(accessibleBusiness ?? ownedBusiness);

  return resolveAuthenticatedLandingPath(hasBusiness, next);
}
