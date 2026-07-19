"use client";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingProductShowcase() {
  const { copy } = useLandingLocale();

  return (
    <section id="platform" className="w-full bg-white/30 px-4 py-12 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="max-w-3xl">
          <p className="landing-eyebrow">
            {copy.platform.eyebrow}
          </p>
          <h2 className="landing-heading mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
            {copy.platform.title}
          </h2>
          <p className="landing-copy mt-5 text-base leading-8 sm:text-lg">
            {copy.platform.subtitle}
          </p>
        </LandingReveal>

        <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {copy.platform.cards.map((card, index) => (
            <LandingReveal key={card.id} delay={index * 0.04}>
              <article className="landing-panel landing-panel-hover flex min-h-0 flex-col justify-between p-4 sm:min-h-[260px] sm:p-5">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg border border-[var(--landing-line)] bg-[var(--landing-soft)] text-[var(--landing-teal)]">
                      <LandingIcon icon={card.icon} className="size-5" />
                    </span>
                    <span className="rounded-full bg-[var(--landing-warm)] px-2.5 py-1 text-xs font-semibold text-[#8a3f31]">
                      {card.metric}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-7 text-[var(--landing-ink)]">
                    {card.title}
                  </h3>
                  <p className="landing-copy mt-3 text-sm leading-7">
                    {card.description}
                  </p>
                </div>
                <p className="mt-7 border-t border-[var(--landing-line)] pt-4 text-xs font-semibold uppercase text-[var(--landing-muted-text)]">
                  {card.detail}
                </p>
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
