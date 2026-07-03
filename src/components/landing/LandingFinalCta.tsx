"use client";

import { ArrowRightIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { Button } from "@/components/ui/button";
import { LANDING_BOOK_DEMO } from "@/features/landing/constants";

export function LandingFinalCta({ onStartFree }: { onStartFree: () => void }) {
  const { copy } = useLandingLocale();

  return (
    <section className="w-full bg-[#101815] px-4 py-20 text-white sm:px-6 sm:py-24">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">
          {copy.finalCta.title}
        </h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-white/62 sm:text-lg">
          {copy.finalCta.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            className="h-12 rounded-full bg-white px-6 text-[#101815] hover:bg-white/90"
            onClick={onStartFree}
          >
            {copy.finalCta.primaryCta}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-full border-white/16 bg-transparent px-6 text-white hover:bg-white/10"
            asChild
          >
            <a href={LANDING_BOOK_DEMO.href}>{copy.finalCta.secondaryCta}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
