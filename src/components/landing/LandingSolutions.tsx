"use client";

import { CheckIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import {
  LandingMarqueeCardShell,
  LandingMarqueeRow,
} from "@/components/landing/LandingMarqueeRow";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingSolutions() {
  const { copy } = useLandingLocale();
  const cards = copy.solutions.cards;
  const loop = [...cards, ...cards, ...cards];

  function SolutionCard({ solution }: { solution: (typeof cards)[number] }) {
    return (
      <article className="flex h-full min-h-[180px] flex-col rounded-xl border border-white/10 bg-white/[0.055] p-4 text-left shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:min-h-[220px] sm:p-5">
        <h3 className="text-base font-semibold text-white sm:text-lg">{solution.title}</h3>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/64 sm:mt-3 sm:line-clamp-none sm:text-sm sm:leading-6">
          {solution.description}
        </p>
        <ul className="mt-auto space-y-1.5 pt-3">
          {solution.outcomes.map((outcome) => (
            <li key={outcome} className="flex items-center gap-2 text-xs text-white/72 sm:text-sm">
              <CheckIcon className="size-3.5 shrink-0 text-[#92e4d0]" aria-hidden="true" />
              {outcome}
            </li>
          ))}
        </ul>
      </article>
    );
  }

  return (
    <section id="solutions" className="landing-dark-band w-full overflow-x-hidden py-8 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <LandingReveal className="max-w-3xl">
          <p className="text-xs font-semibold uppercase text-[#92e4d0]">
            {copy.solutions.eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight sm:mt-4 sm:text-5xl">
            {copy.solutions.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/68 sm:mt-5 sm:text-lg sm:leading-8">
            {copy.solutions.subtitle}
          </p>
        </LandingReveal>

        <div className="mt-12 hidden gap-3 md:grid md:grid-cols-3">
          {cards.map((solution) => (
            <div
              key={solution.title}
              className="transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(0,0,0,0.18)]"
            >
              <SolutionCard solution={solution} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 md:hidden">
        <LandingMarqueeRow direction="left" speed={26}>
          {loop.map((solution, index) => (
            <LandingMarqueeCardShell key={`${solution.title}-${index}`}>
              <SolutionCard solution={solution} />
            </LandingMarqueeCardShell>
          ))}
        </LandingMarqueeRow>
      </div>
    </section>
  );
}
