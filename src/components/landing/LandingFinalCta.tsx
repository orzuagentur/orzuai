"use client";

import { ArrowRightIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { Button } from "@/components/ui/button";

export function LandingFinalCta({ onStartFree }: { onStartFree: () => void }) {
  const { copy } = useLandingLocale();

  return (
    <section className="landing-dark-band w-full px-4 py-12 text-white sm:px-6 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">
          {copy.finalCta.title}
        </h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
          {copy.finalCta.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            className="h-12 rounded-full bg-white px-6 text-[var(--landing-ink)] hover:bg-white/90"
            onClick={onStartFree}
          >
            {copy.finalCta.primaryCta}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
