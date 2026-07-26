import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  recordLoginDevice,
  sendWelcomeIfNeeded,
} from "@/lib/email/devices";
import { withLocale } from "@/i18n/path";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";

function localeFromRequest(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)NEXT_LOCALE=(en|ru|de)/);
  if (match?.[1]) return match[1];
  return routing.defaultLocale;
}

function localizeNext(locale: string, next: string): string {
  if (
    next.startsWith("/en/") ||
    next.startsWith("/ru/") ||
    next.startsWith("/de/") ||
    next === "/en" ||
    next === "/ru" ||
    next === "/de"
  ) {
    return next;
  }
  return withLocale(locale, next);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const locale = localeFromRequest(request);
  const nextRaw = url.searchParams.get("next") || "/dashboard";
  const next = localizeNext(locale, nextRaw);

  if (!code) {
    return NextResponse.redirect(
      new URL(`${withLocale(locale, "/login")}?error=oauth`, url.origin),
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(
      new URL(`${withLocale(locale, "/login")}?error=oauth`, url.origin),
    );
  }

  const user = data.user;
  const email = user.email!;

  await recordLoginDevice({
    userId: user.id,
    email,
    request,
    action: "Google sign-in",
  });

  await sendWelcomeIfNeeded({
    userId: user.id,
    email,
    displayName:
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      null,
  });

  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set("orzu_otp_ok", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set("orzu_otp_uid", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set("orzu_otp_purpose", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
