"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (params.get("reset") === "1") {
      setInfo(t("passwordUpdated"));
    }
    if (params.get("error") === "oauth") {
      setError(t("oauthFailed"));
    }
  }, [params, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      if (res.status === 429 && data.retryAfterSec) {
        setError(
          `${data.error || t("tooManyAttempts")} ${t("waitMinutes", {
            minutes: Math.ceil(data.retryAfterSec / 60),
          })}`,
        );
      } else {
        setError(data.error || t("invalidCredentials"));
      }
      return;
    }

    const notify = await fetch("/api/auth/session-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "Email & password login" }),
    });
    setLoading(false);

    if (!notify.ok) {
      const notifyData = await notify.json().catch(() => ({}));
      if (notifyData.needsOtp) {
        window.location.assign(`/${locale}/login/verify?mode=signup`);
        return;
      }
      setError(notifyData.error || t("sessionFailed"));
      return;
    }

    window.location.assign(`/${locale}/dashboard`);
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/${locale}/dashboard`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (err) {
      setGoogleLoading(false);
      setError(err.message);
    }
  }

  return (
    <div className="panel rise p-7">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher compact />
      </div>
      <h1 className="text-2xl font-semibold">{t("welcomeBack")}</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{t("loginLead")}</p>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        disabled={googleLoading || loading}
        className="btn mt-6 w-full border border-[color:var(--line)] bg-transparent"
      >
        {googleLoading ? t("redirecting") : t("continueGoogle")}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-[color:var(--muted)]">
        <span className="h-px flex-1 bg-[color:var(--line)]" />
        {t("orEmail")}
        <span className="h-px flex-1 bg-[color:var(--line)]" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="field"
          type="email"
          required
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="field"
          type="password"
          required
          placeholder={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-[color:var(--accent)]"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
        {info && <p className="text-sm text-[color:var(--success)]">{info}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? t("signingIn") : t("logIn")}
        </button>
      </form>
      <p className="mt-5 text-sm text-[color:var(--muted)]">
        {t("newHere")}{" "}
        <Link href="/signup" className="text-[color:var(--accent)]">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const tc = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <BrandLogo href="/" size={32} className="mb-10" />
      <Suspense
        fallback={
          <div className="panel p-7 text-sm text-[color:var(--muted)]">
            {tc("loading")}
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
