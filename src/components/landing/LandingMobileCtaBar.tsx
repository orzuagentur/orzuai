"use client";

import { ArrowRightIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { Button } from "@/components/ui/button";

type LandingMobileCtaBarProps = {
  onStartFree: () => void;
};

/** Sticky “Start free” bar — mobile / small screens only. */
export function LandingMobileCtaBar({ onStartFree }: LandingMobileCtaBarProps) {
  const { copy } = useLandingLocale();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--landing-line)] bg-white/92 px-4 pt-3 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <Button
        type="button"
        variant="cta"
        size="cta"
        className="h-12 w-full rounded-xl bg-zinc-900 text-white shadow-[0_12px_28px_rgba(24,24,27,0.18)] hover:bg-zinc-800"
        onClick={onStartFree}
      >
        {copy.hero.primaryCta}
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
