import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";
import { stripLocale, withLocale } from "@/i18n/path";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API + OAuth callback stay outside locale routing
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/signout")
  ) {
    return updateSession(request);
  }

  const intlResponse = intlMiddleware(request);

  // Let next-intl redirects (locale detect / prefix) win
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const authResponse = await updateSession(request, intlResponse);
  return authResponse;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};

/** Re-export helpers used by auth callback */
export { stripLocale, withLocale };
