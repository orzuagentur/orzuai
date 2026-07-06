import { APP_ROUTES, AUTH_ROUTES } from "@/constants/routes";

/** Client-safe redirect helpers — no env or secrets imports. */

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
  _redirectPath: string,
): boolean {
  return false;
}
