"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Request failed");
      return;
    }
    setInfo(data.message || t("forgotSent"));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <BrandLogo href="/" size={32} className="mb-10" />
      <div className="panel rise p-7">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <h1 className="text-2xl font-semibold">{t("forgotTitle")}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{t("forgotLead")}</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="field"
            type="email"
            required
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}
          {info && <p className="text-sm text-[color:var(--success)]">{info}</p>}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? t("sending") : t("sendLink")}
          </button>
        </form>
        <p className="mt-5 text-sm text-[color:var(--muted)]">
          <Link href="/login" className="text-[color:var(--accent)]">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
