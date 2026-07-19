"use client";

import { CheckIcon } from "lucide-react";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";

export function LandingEnterprise() {
  const { copy } = useLandingLocale();
  const enterprise = copy.enterprise;

  return (
    <section id="enterprise" className="w-full bg-zinc-50 px-4 py-8 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-10">
          <LandingReveal>
            <p className="landing-eyebrow">{enterprise.eyebrow}</p>
            <h2 className="landing-heading mt-3 text-2xl font-semibold leading-[1.08] sm:mt-4 sm:text-5xl">
              {enterprise.title}
            </h2>
            <p className="landing-copy mt-3 line-clamp-3 text-sm leading-6 sm:mt-5 sm:line-clamp-none sm:text-lg sm:leading-8">
              {enterprise.subtitle}
            </p>
          </LandingReveal>
          <LandingReveal delay={0.05} className="hidden sm:block">
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

        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-12 sm:gap-3 xl:grid-cols-3">
          {enterprise.pillars.map((pillar, index) => (
            <LandingReveal key={pillar.id} delay={index * 0.04}>
              <article className="landing-panel-hover flex h-full min-h-0 flex-col rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:min-h-[260px] sm:rounded-2xl sm:p-5">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white sm:size-10">
                  <LandingIcon icon={pillar.icon} className="size-4 sm:size-5" />
                </span>
                <p className="mt-3 hidden text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:mt-6 sm:block">
                  {pillar.metric}
                </p>
                <h3 className="mt-2 text-sm font-semibold leading-5 text-zinc-900 sm:text-xl sm:leading-7">
                  {pillar.title}
                </h3>
                <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-5 text-zinc-600 sm:mt-3 sm:line-clamp-none sm:text-sm sm:leading-7">
                  {pillar.description}
                </p>
                <p className="mt-3 hidden text-xs font-semibold uppercase tracking-wide text-zinc-400 sm:mt-5 sm:block">
                  {pillar.detail}
                </p>
              </article>
            </LandingReveal>
          ))}
        </div>

        {enterprise.checklist && enterprise.checklist.length > 0 ? (
          <LandingReveal className="mt-10 hidden sm:block">
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
