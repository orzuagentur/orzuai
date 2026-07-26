"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { useRouter } from "@/i18n/navigation";

function VerifyForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const isSignup = params.get("mode") === "signup";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const dev = sessionStorage.getItem("orzu_dev_otp");
    if (dev) {
      setInfo(`Dev mode (no Resend key): code is ${dev}`);
      sessionStorage.removeItem("orzu_dev_otp");
    }
  }, []);

  useEffect(() => {
    if (isSignup) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/session-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "Email & password login" }),
      });
      if (cancelled) return;
      if (res.ok) {
        router.replace("/dashboard");
        router.refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignup, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Verification failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function resend() {
    setResending(true);
    setError(null);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: isSignup ? "signup" : "login" }),
    });
    const data = await res.json().catch(() => ({}));
    setResending(false);
    if (!res.ok) {
      setError(data.error || "Could not resend code");
      return;
    }
    if (data.devCode) {
      setInfo(`Dev mode: code is ${data.devCode}`);
    } else {
      setInfo("A new verification code was sent to your email.");
    }
  }

  async function cancel() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(isSignup ? "/signup" : "/login");
    router.refresh();
  }

  return (
    <div className="panel rise p-7">
      <h1 className="text-2xl font-semibold">
        {isSignup ? t("verifyTitle") : t("signingIn")}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        {isSignup ? t("verifyLead") : tc("loading")}
      </p>

      {isSignup ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="field tracking-[0.35em] text-center text-lg"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            placeholder="••••••"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            autoFocus
          />
          {error && (
            <p className="text-sm text-[color:var(--danger)]">{error}</p>
          )}
          {info && (
            <p className="text-sm text-[color:var(--success)]">{info}</p>
          )}
          <button
            className="btn btn-primary w-full"
            disabled={loading || code.length !== 6}
          >
            {loading ? t("verifying") : t("verify")}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-[color:var(--muted)]">{tc("loading")}</p>
      )}

      {isSignup ? (
        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="text-[color:var(--accent)]"
            disabled={resending}
            onClick={() => void resend()}
          >
            {resending ? t("sending") : t("resend")}
          </button>
          <button
            type="button"
            className="text-[color:var(--muted)]"
            onClick={() => void cancel()}
          >
            {t("backToLogin")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function LoginVerifyPage() {
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
        <VerifyForm />
      </Suspense>
    </main>
  );
}
