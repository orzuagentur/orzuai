"use client";

import { CheckIcon } from "lucide-react";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingEnterprise() {
  const { copy } = useLandingLocale();
  const enterprise = copy.enterprise;

  return (
    <section id="enterprise" className="w-full bg-zinc-50 px-4 py-12 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <LandingReveal>
            <p className="landing-eyebrow">{enterprise.eyebrow}</p>
            <h2 className="landing-heading mt-4 text-3xl font-semibold leading-[1.08] sm:text-5xl">
              {enterprise.title}
            </h2>
            <p className="landing-copy mt-5 text-base leading-8 sm:text-lg">
              {enterprise.subtitle}
            </p>
          </LandingReveal>
          <LandingReveal delay={0.05}>
            {enterprise.honestyNote ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Honest scope
                </p>
                <p className="mt-2 text-sm leading-7 text-zinc-600">
                  {enterprise.honestyNote}
                </p>
              </div>
            ) : null}
          </LandingReveal>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {enterprise.pillars.map((pillar, index) => (
            <LandingReveal key={pillar.id} delay={index * 0.04}>
              <article className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:min-h-[260px]">
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <LandingIcon icon={pillar.icon} className="size-5" />
                </span>
                <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {pillar.metric}
                </p>
                <h3 className="mt-2 text-xl font-semibold leading-7 text-zinc-900">
                  {pillar.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-zinc-600">
                  {pillar.description}
                </p>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {pillar.detail}
                </p>
              </article>
            </LandingReveal>
          ))}
        </div>

        {enterprise.checklist && enterprise.checklist.length > 0 ? (
          <LandingReveal className="mt-10">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
              <p className="text-sm font-semibold text-zinc-900">
                {enterprise.checklistTitle ?? "What enterprise teams should verify"}
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {enterprise.checklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-6 text-zinc-600"
                  >
                    <CheckIcon
                      className="mt-0.5 size-4 shrink-0 text-zinc-900"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </LandingReveal>
        ) : null}
      </div>
    </section>
  );
}
