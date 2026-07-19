"use client";

import { PlusIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { cn } from "@/lib/utils";

export function LandingFaq() {
  const { copy } = useLandingLocale();

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="landing-eyebrow">FAQ</p>
        <h2
          id="faq-heading"
          className="landing-heading mt-3 text-2xl font-semibold leading-tight sm:mt-4 sm:text-5xl"
        >
          {copy.faq.title}
        </h2>
        <p className="landing-copy mt-3 line-clamp-2 text-sm leading-6 sm:mt-5 sm:line-clamp-none sm:text-base sm:leading-8">
          {copy.faq.subtitle}
        </p>
      </div>

      <div className="space-y-2">
        {copy.faq.items.map((item) => (
          <details
            key={item.question}
            className={cn(
              "group landing-panel px-3 py-2.5 transition open:border-[var(--landing-teal)]/45 open:shadow-[0_18px_50px_rgba(18,60,53,0.12)] sm:px-4 sm:py-3",
            )}
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--landing-ink)] marker:content-none sm:text-base [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3 sm:gap-4">
                {item.question}
                <PlusIcon
                  className="size-4 shrink-0 text-[var(--landing-muted-text)] transition-transform group-open:rotate-45"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <p className="landing-copy -mx-3 mt-2 border-t border-[var(--landing-line)] px-3 pt-2 text-xs leading-5 sm:-mx-4 sm:mt-3 sm:px-4 sm:pt-3 sm:text-sm sm:leading-7">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
