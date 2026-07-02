import { APP_ROUTES, AUTH_ROUTES } from "@/constants/routes";
import { getAppUrl } from "@/lib/env";

export {
  isAuthEntryRoute,
  isProtectedRoute,
  isPublicAuthFlowRoute,
} from "@/utils/auth-routes";

export {
  getPostAuthRedirectPath,
  getSafeRedirectPath,
  shouldUseVerifySuccessRedirect,
} from "@/utils/auth-redirect";

export function buildAuthCallbackUrl(
  nextPath: string = APP_ROUTES.dashboard,
): string {
  const callbackUrl = new URL(AUTH_ROUTES.callback, getAppUrl());
  callbackUrl.searchParams.set("next", nextPath);

  return callbackUrl.toString();
}

export function buildAuthConfirmUrl(
  nextPath: string = APP_ROUTES.dashboard,
): string {
  const confirmUrl = new URL(AUTH_ROUTES.confirm, getAppUrl());
  confirmUrl.searchParams.set("next", nextPath);

  return confirmUrl.toString();
}
