import { APP_ROUTES, AUTH_ROUTES } from "@/constants/routes";
import { getAppUrl } from "@/lib/env";

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

export function getSafeRedirectPath(next: string | null | undefined): string {
  if (!next) {
    return APP_ROUTES.dashboard;
  }

  const trimmed = next.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return APP_ROUTES.dashboard;
  }

  return trimmed;
}

export function getPostAuthRedirectPath(
  next: string | null | undefined,
): string {
  const redirectPath = getSafeRedirectPath(next);

  if (redirectPath === AUTH_ROUTES.resetPassword) {
    return AUTH_ROUTES.resetPassword;
  }

  return redirectPath;
}

export function shouldUseVerifySuccessRedirect(
  redirectPath: string,
): boolean {
  return redirectPath !== AUTH_ROUTES.resetPassword;
}

export function isProtectedRoute(pathname: string): boolean {
  return pathname === APP_ROUTES.dashboard || pathname.startsWith("/dashboard/");
}

export function isAuthEntryRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTES.login ||
    pathname === AUTH_ROUTES.register ||
    pathname === AUTH_ROUTES.forgotPassword
  );
}

export function isPublicAuthFlowRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTES.callback ||
    pathname === AUTH_ROUTES.confirm ||
    pathname === AUTH_ROUTES.verifySuccess ||
    pathname === AUTH_ROUTES.authCodeError ||
    pathname === AUTH_ROUTES.registerConfirmation ||
    pathname === AUTH_ROUTES.forgotPasswordConfirmation ||
    pathname === AUTH_ROUTES.resetPasswordSuccess ||
    pathname.startsWith("/auth/register/") ||
    pathname.startsWith("/auth/forgot-password/")
  );
}
