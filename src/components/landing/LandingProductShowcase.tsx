"use client";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import {
  LandingMarqueeCardShell,
  LandingMarqueeRow,
} from "@/components/landing/LandingMarqueeRow";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingProductShowcase() {
  const { copy } = useLandingLocale();
  const cards = copy.platform.cards;
  const mid = Math.ceil(cards.length / 2);
  const rowA = cards.slice(0, mid);
  const rowB = cards.slice(mid);

  function Card({ card }: { card: (typeof cards)[number] }) {
    return (
      <article className="landing-panel flex h-full min-h-[168px] flex-col justify-between p-3.5 sm:min-h-[200px] sm:p-5">
        <div>
          <span className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--landing-line)] bg-[var(--landing-soft)] text-[var(--landing-teal)]">
            <LandingIcon icon={card.icon} className="size-4" />
          </span>
          <h3 className="mt-3 text-base font-semibold leading-6 text-[var(--landing-ink)]">
            {card.title}
          </h3>
          <p className="landing-copy mt-1.5 line-clamp-3 text-xs leading-5 sm:text-sm sm:leading-6">
            {card.description}
          </p>
        </div>
      </article>
    );
  }

  return (
    <section id="platform" className="w-full overflow-x-hidden bg-white/30 py-8 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <LandingReveal className="max-w-3xl">
          <p className="landing-eyebrow">{copy.platform.eyebrow}</p>
          <h2 className="landing-heading mt-3 text-2xl font-semibold leading-tight sm:mt-4 sm:text-5xl">
            {copy.platform.title}
          </h2>
          <p className="landing-copy mt-3 text-sm leading-6 sm:mt-5 sm:text-lg sm:leading-8">
            {copy.platform.subtitle}
          </p>
        </LandingReveal>
      </div>

      <div className="mt-6 space-y-2.5 sm:mt-12 sm:space-y-3">
        <LandingMarqueeRow direction="left" speed={26}>
          {[...rowA, ...rowA, ...rowA].map((card, index) => (
            <LandingMarqueeCardShell key={`${card.id}-a-${index}`}>
              <Card card={card} />
            </LandingMarqueeCardShell>
          ))}
        </LandingMarqueeRow>

        <LandingMarqueeRow direction="right" speed={24}>
          {[...rowB, ...rowB, ...rowB].map((card, index) => (
            <LandingMarqueeCardShell key={`${card.id}-b-${index}`}>
              <Card card={card} />
            </LandingMarqueeCardShell>
          ))}
        </LandingMarqueeRow>
      </div>
    </section>
  );
}
