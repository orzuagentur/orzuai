"use client";

import Link from "next/link";

const CARDS = [
  {
    href: "/dashboard/creators/presentation",
    title: "Classic presentation",
    subtitle: "Slides, themes, charts, photos — export all pages PPTX / PDF",
    badge: "Editor",
    accent: "#e8a54b",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="3"
          y="4"
          width="18"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M8 21h8M12 18v3"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M7 9h4M7 12h6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/creators/library",
    title: "Library",
    subtitle: "3D models, HDRIs, photos, videos, icons & emojis",
    badge: "Assets",
    accent: "#60a5fa",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M12 12v8M12 12 4 8.5M12 12l8-3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

export function CreatorsHub() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(var(--mobile-nav-space)+1.5rem)] pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8 sm:mb-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
          For creators
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--fg)] sm:text-4xl"
          style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
        >
          What will you create?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          Open a classic presentation workspace or browse the asset library for
          your next project.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-6 transition duration-300 hover:border-[rgba(232,165,75,0.45)] hover:bg-[rgba(255,255,255,0.03)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-30 blur-3xl transition group-hover:opacity-50"
              style={{ background: card.accent }}
              aria-hidden
            />
            <div className="relative flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.25)] text-[var(--fg)] transition group-hover:scale-105"
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
                Open
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
