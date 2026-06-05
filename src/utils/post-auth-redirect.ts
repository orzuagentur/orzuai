import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
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
