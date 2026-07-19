"use client";

import { CheckIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingSolutions() {
  const { copy } = useLandingLocale();

  return (
    <section id="solutions" className="landing-dark-band w-full px-4 py-12 text-white sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <LandingReveal>
          <p className="text-xs font-semibold uppercase text-[#92e4d0]">
            {copy.solutions.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
            {copy.solutions.title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/68 sm:text-lg">
            {copy.solutions.subtitle}
          </p>
        </LandingReveal>

        <div className="grid gap-3">
          {copy.solutions.cards.map((solution, index) => (
            <LandingReveal key={solution.title} delay={index * 0.05}>
              <article className="grid gap-5 rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:grid-cols-[1fr_220px]">
                <div>
                  <h3 className="text-xl font-semibold text-white">{solution.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/64">
                    {solution.description}
                  </p>
                </div>
                <ul className="space-y-2">
                  {solution.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-center gap-2 text-sm text-white/72">
                      <CheckIcon className="size-4 text-[#92e4d0]" aria-hidden="true" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
