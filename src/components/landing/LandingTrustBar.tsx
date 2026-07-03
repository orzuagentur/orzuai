"use client";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";

export function LandingTrustBar() {
  const { copy } = useLandingLocale();

  return (
    <section className="w-full border-y border-[#d9e3dc] bg-white/74 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center">
        <p className="shrink-0 text-xs font-semibold uppercase text-[#69766f]">
          {copy.trust.eyebrow}
        </p>
        <div className="flex flex-wrap gap-2">
          {copy.trust.items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#d9e3dc] bg-[#f7f9f6] px-3 py-1.5 text-xs font-medium text-[#34443c]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
