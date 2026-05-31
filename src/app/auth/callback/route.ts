import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { authCallbackQuerySchema } from "@/types/auth.types";
import {
  getPostAuthRedirectPath,
  getSafeRedirectPath,
  shouldUseVerifySuccessRedirect,
} from "@/utils/auth";

export async function GET(request: NextRequest) {
  const query = authCallbackQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!query.success) {
    return NextResponse.redirect(
      new URL(AUTH_ROUTES.authCodeError, request.url),
    );
  }

  const { code, next, error, error_description: errorDescription } =
    query.data;

  if (error) {
    const errorUrl = new URL(AUTH_ROUTES.authCodeError, request.url);
    errorUrl.searchParams.set(
      "message",
      errorDescription ?? error,
    );

    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(AUTH_ROUTES.authCodeError, request.url),
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const errorUrl = new URL(AUTH_ROUTES.authCodeError, request.url);
    errorUrl.searchParams.set("message", exchangeError.message);

    return NextResponse.redirect(errorUrl);
  }

  const redirectPath = getPostAuthRedirectPath(next);

  if (!shouldUseVerifySuccessRedirect(redirectPath)) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  const successUrl = new URL(AUTH_ROUTES.verifySuccess, request.url);
  successUrl.searchParams.set("next", getSafeRedirectPath(next));

  return NextResponse.redirect(successUrl);
}
