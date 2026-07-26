import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { stripLocale, withLocale } from "@/i18n/path";
import { routing } from "@/i18n/routing";

export async function updateSession(
  request: NextRequest,
  baseResponse?: NextResponse,
) {
  let supabaseResponse =
    baseResponse ??
    NextResponse.next({
      request,
    });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          // Preserve cookies/headers from intl middleware when present
          if (baseResponse) {
            baseResponse.cookies.getAll().forEach((c) => {
              supabaseResponse.cookies.set(c.name, c.value);
            });
            baseResponse.headers.forEach((value, key) => {
              if (key.toLowerCase() === "set-cookie") return;
              supabaseResponse.headers.set(key, value);
            });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rawPath = request.nextUrl.pathname;
  const { locale: pathLocale, pathnameWithoutLocale: path } =
    stripLocale(rawPath);
  const locale =
    pathLocale ||
    (request.cookies.get("NEXT_LOCALE")?.value as string | undefined) ||
    routing.defaultLocale;

  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/auth/forgot-password") ||
    path.startsWith("/auth/reset-password");
  const isVerifyPage = path.startsWith("/login/verify");
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/training");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = withLocale(locale, "/login");
    return NextResponse.redirect(url);
  }

  if (!user && isVerifyPage) {
    const url = request.nextUrl.clone();
    url.pathname = withLocale(locale, "/login");
    return NextResponse.redirect(url);
  }

  const otpOk = request.cookies.get("orzu_otp_ok")?.value;
  const otpUid = request.cookies.get("orzu_otp_uid")?.value;
  const otpPurpose = request.cookies.get("orzu_otp_purpose")?.value;
  /** Email OTP is required only for signup (explicit purpose cookie) */
  const otpPending = Boolean(
    user &&
      otpOk === "0" &&
      otpUid === user.id &&
      otpPurpose === "signup",
  );

  if (user && otpPending && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = withLocale(locale, "/login/verify");
    url.searchParams.set("mode", "signup");
    return NextResponse.redirect(url);
  }

  if (user && isVerifyPage && !otpPending) {
    const url = request.nextUrl.clone();
    url.pathname = withLocale(locale, "/dashboard");
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage && !isVerifyPage && !otpPending) {
    const url = request.nextUrl.clone();
    url.pathname = withLocale(locale, "/dashboard");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
