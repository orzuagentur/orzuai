import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/constants/routes";
import { verifyEmailWithTokenHash } from "@/services/auth.service";
import { authConfirmQuerySchema } from "@/types/auth.types";
import {
  getPostAuthRedirectPath,
  getSafeRedirectPath,
  shouldUseVerifySuccessRedirect,
} from "@/utils/auth";

export async function GET(request: NextRequest) {
  const query = authConfirmQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!query.success) {
    return NextResponse.redirect(
      new URL(AUTH_ROUTES.authCodeError, request.url),
    );
  }

  const {
    token_hash: tokenHash,
    type,
    next,
    error,
    error_description: errorDescription,
  } = query.data;

  if (error) {
    const errorUrl = new URL(AUTH_ROUTES.authCodeError, request.url);
    errorUrl.searchParams.set("message", errorDescription ?? error);

    return NextResponse.redirect(errorUrl);
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(AUTH_ROUTES.authCodeError, request.url),
    );
  }

  const result = await verifyEmailWithTokenHash(tokenHash, type);

  if (!result.success) {
    const errorUrl = new URL(AUTH_ROUTES.authCodeError, request.url);
    errorUrl.searchParams.set("message", result.error);

    return NextResponse.redirect(errorUrl);
  }

  const redirectPath =
    type === "recovery"
      ? AUTH_ROUTES.resetPassword
      : getPostAuthRedirectPath(next);

  if (!shouldUseVerifySuccessRedirect(redirectPath)) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  const successUrl = new URL(AUTH_ROUTES.verifySuccess, request.url);
  successUrl.searchParams.set("next", getSafeRedirectPath(next));

  return NextResponse.redirect(successUrl);
}
