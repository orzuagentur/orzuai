"use client";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LANDING_FAQ } from "@/features/landing/constants";

export function LandingFaq() {
  const { copy } = useLandingLocale();

  return (
    <section className="relative z-10 w-full max-w-3xl px-6 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.faqTitle}
        </h2>
      </div>

      <div className="mt-10 space-y-3">
        {LANDING_FAQ.items.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm"
          >
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.question}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
