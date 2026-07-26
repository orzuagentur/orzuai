"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** Public marketing / legal pages — shared chrome. */
export function SiteChrome({
  children,
  wide = false,
  bare = false,
}: {
  children: ReactNode;
  wide?: boolean;
  /** Full-bleed layout (landing) — no content max-width wrapper */
  bare?: boolean;
}) {
  const t = useTranslations("chrome");

  return (
    <div className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--fg)]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(247,248,251,0)), linear-gradient(135deg, rgba(15,118,110,0.055), transparent 42%)",
        }}
      />
      <div
        className={`relative mx-auto flex min-h-screen w-full flex-col ${
          bare
            ? "max-w-none px-0 pb-0 pt-0"
            : `px-5 pb-12 pt-5 sm:px-8 sm:pt-6 ${wide ? "max-w-5xl" : "max-w-3xl"}`
        }`}
      >
        <header
          className={`z-30 flex items-center justify-between gap-3 ${
            bare
              ? "sticky top-0 border-b border-[color:var(--line)] bg-[color:var(--bg-elevated)]/92 px-4 py-3 backdrop-blur-md sm:px-8"
              : ""
          }`}
        >
          <BrandLogo href="/" size={34} />
          <nav
            className="flex items-center gap-1.5 sm:gap-2.5"
            aria-label={t("navAccount")}
          >
            <span className="hidden sm:inline-flex">
              <LanguageSwitcher compact />
            </span>
            <Link
              href="/features"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:bg-[color:var(--overlay-med)] hover:text-[color:var(--fg)] sm:inline-flex sm:px-4"
            >
              {t("features")}
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--muted)] transition hover:bg-[color:var(--overlay-med)] hover:text-[color:var(--fg)] sm:px-4"
            >
              {t("logIn")}
            </Link>
            <Link
              href="/signup"
              className="btn btn-primary inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm sm:min-h-11 sm:px-5"
              aria-label={t("startFree")}
            >
              <span className="hidden sm:inline">{t("startFree")}</span>
              <span className="sm:hidden">{t("startShort")}</span>
            </Link>
          </nav>
        </header>
        <div className="flex-1">{children}</div>
        {!bare ? <SiteFooter /> : null}
      </div>
    </div>
  );
}

export function SiteFooter() {
  const t = useTranslations("chrome");
  const tc = useTranslations("common");
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-syne)] text-sm font-semibold tracking-tight text-[color:var(--fg)]">
            OrzuAi
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {t("footerTagline", { year })}
          </p>
          <div className="mt-3 sm:hidden">
            <LanguageSwitcher />
          </div>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[color:var(--muted)]"
          aria-label={t("navLegal")}
        >
          <span className="hidden sm:inline-flex">
            <LanguageSwitcher compact />
          </span>
          <Link href="/about" className="transition hover:text-[color:var(--fg)]">
            {t("about")}
          </Link>
          <Link
            href="/features"
            className="transition hover:text-[color:var(--fg)]"
          >
            {t("features")}
          </Link>
          <Link
            href="/privacy"
            className="transition hover:text-[color:var(--fg)]"
          >
            {t("privacy")}
          </Link>
          <Link href="/terms" className="transition hover:text-[color:var(--fg)]">
            {t("terms")}
          </Link>
          <a
            href="mailto:support@orzuai.com"
            className="transition hover:text-[color:var(--fg)]"
          >
            {tc("support")}
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function LegalArticle({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const t = useTranslations("chrome");
  return (
    <article className="mt-12">
      <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        {t("lastUpdated", { date: updated })}
      </p>
      <div className="prose-legal mt-8 space-y-5 text-[15px] leading-relaxed text-[color:var(--fg)]">
        {children}
      </div>
    </article>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-2 font-[family-name:var(--font-syne)] text-xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}
