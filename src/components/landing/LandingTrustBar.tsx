"use client";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingMarqueeRow } from "@/components/landing/LandingMarqueeRow";

export function LandingTrustBar() {
  const { copy } = useLandingLocale();

  const chips = copy.trust.items.map((item) => (
    <span
      key={item}
      className="shrink-0 rounded-full border border-[var(--landing-line)] bg-white/78 px-2.5 py-1 text-[11px] font-medium text-[var(--landing-primary)] sm:px-3 sm:py-1.5 sm:text-xs"
    >
      {item}
    </span>
  ));

  return (
    <section className="w-full border-y border-[var(--landing-line)] bg-white/70 px-4 py-3 backdrop-blur sm:px-6 sm:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:gap-4 lg:flex-row lg:items-center">
        <p className="shrink-0 text-[10px] font-semibold uppercase text-[var(--landing-muted-text)] sm:text-xs">
          {copy.trust.eyebrow}
        </p>

        {/* Mobile: infinite marquee like other landing ribbons */}
        <div className="md:hidden">
          <LandingMarqueeRow direction="left" speed={26} className="-mx-4">
            {[0, 1, 2].flatMap((copyIndex) =>
              copy.trust.items.map((item) => (
                <span
                  key={`${copyIndex}-${item}`}
                  className="shrink-0 rounded-full border border-[var(--landing-line)] bg-white/78 px-2.5 py-1 text-[11px] font-medium text-[var(--landing-primary)]"
                >
                  {item}
                </span>
              )),
            )}
          </LandingMarqueeRow>
        </div>

        {/* Desktop / tablet: static wrap */}
        <div className="hidden flex-wrap gap-2 md:flex">{chips}</div>
      </div>
    </section>
  );
}
