"use client";

import { PlusIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";

export function LandingFaq() {
  const { copy } = useLandingLocale();

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="text-xs font-semibold uppercase text-[#1e6f5c]">FAQ</p>
        <h2
          id="faq-heading"
          className="mt-4 text-3xl font-semibold leading-tight text-[#101815] sm:text-5xl"
        >
          {copy.faq.title}
        </h2>
        <p className="mt-5 text-base leading-8 text-[#52625a]">{copy.faq.subtitle}</p>
      </div>

      <div className="space-y-2">
        {copy.faq.items.map((item) => (
          <details
            key={item.question}
            className="group rounded-lg border border-[#d9e3dc] bg-white px-4 py-3"
          >
            <summary className="cursor-pointer list-none text-base font-semibold text-[#101815] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.question}
                <PlusIcon
                  className="size-4 shrink-0 text-[#69766f] transition-transform group-open:rotate-45"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-[#52625a]">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
