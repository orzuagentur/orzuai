"use client";

import Link from "next/link";

/** Beautiful gate when admin locks a tool as under development. */
export function UnderDevelopmentCard({
  title = "Coming soon",
  backHref = "/dashboard",
  backLabel = "Back to Home",
}: {
  title?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div
        className="relative w-full overflow-hidden rounded-3xl border border-[color:var(--line)] p-8 sm:p-10"
        style={{
          background:
            "radial-gradient(120% 80% at 10% 0%, rgba(232,165,75,0.18), transparent 55%), radial-gradient(100% 70% at 100% 100%, rgba(96,165,250,0.12), transparent 50%), var(--bg-elevated)",
        }}
      >
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-black/25 text-2xl"
          style={{ color: "var(--accent)" }}
          aria-hidden
        >
          ✦
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          In development
        </p>
        <h1
          className="mt-3 text-2xl font-bold tracking-tight text-[color:var(--fg)] sm:text-3xl"
          style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
        >
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)] sm:text-base">
          These tools are currently in development and will be available soon.
          Thanks for your patience — we&apos;re already working on them.
        </p>
        <Link
          href={backHref}
          className="mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          style={{ background: "#E8A54B" }}
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
