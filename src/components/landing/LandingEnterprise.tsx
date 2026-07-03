"use client";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingEnterprise() {
  const { copy } = useLandingLocale();

  return (
    <section id="enterprise" className="w-full bg-white px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <LandingReveal>
            <p className="text-xs font-semibold uppercase text-[#1e6f5c]">
              {copy.enterprise.eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#101815] sm:text-5xl">
              {copy.enterprise.title}
            </h2>
          </LandingReveal>
          <LandingReveal delay={0.05}>
            <p className="text-base leading-8 text-[#52625a] sm:text-lg">
              {copy.enterprise.subtitle}
            </p>
          </LandingReveal>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {copy.enterprise.pillars.map((pillar, index) => (
            <LandingReveal key={pillar.id} delay={index * 0.05}>
              <article className="min-h-[280px] rounded-lg border border-[#d9e3dc] bg-[#f7f9f6] p-5">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[#101815] text-white">
                  <LandingIcon icon={pillar.icon} className="size-5" />
                </span>
                <p className="mt-8 text-xs font-semibold uppercase text-[#1e6f5c]">
                  {pillar.metric}
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-7 text-[#101815]">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5a6961]">
                  {pillar.description}
                </p>
                <p className="mt-6 text-xs font-semibold uppercase text-[#75827b]">
                  {pillar.detail}
                </p>
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
