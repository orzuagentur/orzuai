"use client";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";

export function LandingSkipLink() {
  const { copy } = useLandingLocale();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-950"
    >
      {copy.skipToContent}
    </a>
  );
}
