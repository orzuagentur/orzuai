"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CreatorsHub() {
  const t = useTranslations("studio.creators");

  const cards = [
    {
      href: "/dashboard/creators/content",
      title: t("contentTitle"),
      subtitle: t("contentSubtitle"),
      badge: t("contentBadge"),
      accent: "#E8A54B",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M17 9h4v10a2 2 0 0 1-2 2h-8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M8 10.5 12 13l-4 2.5v-5Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      href: "/dashboard/creators/photo-editor",
      title: t("photoTitle"),
      subtitle: t("photoSubtitle"),
      badge: t("photoBadge"),
      accent: "#34d399",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M3 16.5 8 12l3.5 3.5L15 12l6 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: "/dashboard/creators/ai-presentation",
      title: t("aiPresentTitle"),
      subtitle: t("aiPresentSubtitle"),
      badge: t("aiPresentBadge"),
      accent: "#c084fc",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <rect x="7" y="7" width="10" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
          <path d="M10 12h4M12 10v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/dashboard/creators/presentation",
      title: t("classicTitle"),
      subtitle: t("classicSubtitle"),
      badge: t("classicBadge"),
      accent: "#e8a54b",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8 21h8M12 18v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M7 9h4M7 12h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(var(--mobile-nav-space)+1.5rem)] pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8 sm:mb-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
          {t("eyebrow")}
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--fg)] sm:text-4xl"
          style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
        >
          {t("title")}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          {t("lead")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(196,125,34,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-30 blur-3xl transition group-hover:opacity-50"
              style={{ background: card.accent }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--fg)] shadow-sm transition group-hover:scale-105"
                  style={{ color: card.accent }}
                >
                  {card.icon}
                </div>
                <span className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {card.badge}
                </span>
              </div>
              <div>
                <h2
                  className="text-xl font-semibold tracking-tight text-[var(--fg)] sm:text-2xl"
                  style={{
                    fontFamily: "var(--font-display), system-ui, sans-serif",
                  }}
                >
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {card.subtitle}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                {t("open")}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="transition group-hover:translate-x-1"
                  aria-hidden
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
