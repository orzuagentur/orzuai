"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { isPasswordValid, PASSWORD_MIN_LENGTH } from "@/lib/password";

export default function SignupPage() {
  const t = useTranslations("auth");
  const tChrome = useTranslations("chrome");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isPasswordValid(password)) {
      setLoading(false);
      setError(
        `Use at least ${PASSWORD_MIN_LENGTH} characters with a letter, number, and symbol.`,
      );
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not create account");
      return;
    }

    if (data.devCode) {
      sessionStorage.setItem("orzu_dev_otp", String(data.devCode));
    }
    router.push("/login/verify?mode=signup");
    router.refresh();
  }

  async function signUpWithGoogle() {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/${locale}/dashboard`,
      },
    });
    if (err) {
      setGoogleLoading(false);
      setError(err.message);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <BrandLogo href="/" size={32} className="mb-10" />
      <div className="panel rise p-7">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <h1 className="text-2xl font-semibold">{t("signupTitle")}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{t("signupLead")}</p>

        <button
          type="button"
          onClick={() => void signUpWithGoogle()}
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
          <div className="space-y-2">
            <input
              className="field"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordStrengthMeter password={password} />
          </div>
          {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
          <button
            className="btn btn-primary w-full"
            disabled={loading || !isPasswordValid(password)}
          >
            {loading ? t("creating") : t("createAccount")}
          </button>
        </form>
        <p className="mt-4 text-xs text-[color:var(--muted)]">
          {t("agreePrefix")}{" "}
          <Link href="/terms" className="text-[color:var(--accent)]">
            {tChrome("terms")}
          </Link>{" "}
          {t("and")}{" "}
          <Link href="/privacy" className="text-[color:var(--accent)]">
            {tChrome("privacy")}
          </Link>
          .
        </p>
        <p className="mt-5 text-sm text-[color:var(--muted)]">
          {t("haveAccount")}{" "}
          <Link href="/login" className="text-[color:var(--accent)]">
            {t("logIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
