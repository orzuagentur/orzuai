"use client";

import { PlusIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";

export function LandingFaq() {
  const { copy } = useLandingLocale();

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="landing-eyebrow">FAQ</p>
        <h2
          id="faq-heading"
          className="landing-heading mt-4 text-3xl font-semibold leading-tight sm:text-5xl"
        >
          {copy.faq.title}
        </h2>
        <p className="landing-copy mt-5 text-base leading-8">{copy.faq.subtitle}</p>
      </div>

      <div className="space-y-2">
        {copy.faq.items.map((item) => (
          <details
            key={item.question}
            className="group landing-panel px-4 py-3 transition open:border-[var(--landing-teal)]/45 open:shadow-[0_18px_50px_rgba(18,60,53,0.12)]"
          >
            <summary className="cursor-pointer list-none text-base font-semibold text-[var(--landing-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.question}
                <PlusIcon
                  className="size-4 shrink-0 text-[var(--landing-muted-text)] transition-transform group-open:rotate-45"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <p className="landing-copy -mx-4 mt-3 border-t border-[var(--landing-line)] px-4 pt-3 text-sm leading-7">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
