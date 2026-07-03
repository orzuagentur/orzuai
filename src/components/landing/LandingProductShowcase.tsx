"use client";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingProductShowcase() {
  const { copy } = useLandingLocale();

  return (
    <section id="platform" className="w-full bg-[#f7f9f6] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="max-w-3xl">
          <p className="text-xs font-semibold uppercase text-[#1e6f5c]">
            {copy.platform.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#101815] sm:text-5xl">
            {copy.platform.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-[#52625a] sm:text-lg">
            {copy.platform.subtitle}
          </p>
        </LandingReveal>

        <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {copy.platform.cards.map((card, index) => (
            <LandingReveal key={card.id} delay={index * 0.04}>
              <article className="flex min-h-[260px] flex-col justify-between rounded-lg border border-[#d9e3dc] bg-white p-5 shadow-[0_1px_0_rgba(24,36,30,0.04)] transition hover:border-[#b8cbc1] hover:bg-[#fcfdfc]">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg border border-[#d9e3dc] bg-[#f7f9f6] text-[#1e6f5c]">
                      <LandingIcon icon={card.icon} className="size-5" />
                    </span>
                    <span className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs font-semibold text-[#1e6f5c]">
                      {card.metric}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-7 text-[#101815]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#5a6961]">
                    {card.description}
                  </p>
                </div>
                <p className="mt-7 border-t border-[#edf1ee] pt-4 text-xs font-semibold uppercase text-[#75827b]">
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
