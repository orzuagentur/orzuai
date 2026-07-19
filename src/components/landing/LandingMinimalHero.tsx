"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";

import { LivePlatformSurface } from "@/components/landing/live-demo";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { Button } from "@/components/ui/button";
import { LANDING_BOOK_DEMO } from "@/features/landing/constants";

type LandingMinimalHeroProps = {
  onStartFree: () => void;
};

export function LandingMinimalHero({ onStartFree }: LandingMinimalHeroProps) {
  const { copy } = useLandingLocale();

  return (
    <section
      id="live-platform"
      className="relative isolate w-full overflow-hidden px-4 pb-8 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:pb-20"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="landing-eyebrow mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-[var(--landing-line)] bg-white/74 px-3 py-1.5 shadow-sm backdrop-blur"
          >
            <span className="size-1.5 rounded-full bg-[var(--landing-coral)]" aria-hidden="true" />
            {copy.hero.eyebrow}
          </motion.p>
          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.42 }}
            className="mt-4 text-3xl font-semibold leading-[1.04] text-[var(--landing-ink)] sm:mt-5 sm:text-5xl lg:text-6xl"
          >
            {copy.hero.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.42 }}
            className="landing-copy mx-auto mt-3 max-w-3xl text-sm leading-6 sm:mt-5 sm:text-lg sm:leading-8"
          >
            {copy.hero.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.42 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6"
          >
            <Button
              type="button"
              variant="cta"
              size="cta"
              className="h-12 rounded-full bg-zinc-900 px-6 text-white shadow-[0_18px_38px_rgba(24,24,27,0.18)] hover:bg-zinc-800"
              onClick={onStartFree}
            >
              {copy.hero.primaryCta}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="cta"
              className="h-12 rounded-full border-[var(--landing-line)] bg-white/82 px-6 text-[var(--landing-ink)] shadow-sm backdrop-blur hover:bg-[var(--landing-soft)]"
              asChild
            >
              <a href={LANDING_BOOK_DEMO.href}>{copy.hero.secondaryCta}</a>
            </Button>
          </motion.div>
        </div>

        <LivePlatformSurface />

        <div className="mx-auto mt-6 hidden max-w-4xl gap-2 sm:mt-8 sm:grid sm:grid-cols-3">
          {copy.hero.metrics.map((metric) => (
            <div
              key={metric.label}
              className="landing-panel landing-panel-hover px-4 py-3 text-center"
            >
              <p className="text-2xl font-semibold text-[var(--landing-ink)]">{metric.value}</p>
              <p className="mt-1 text-xs font-medium uppercase text-[var(--landing-muted-text)]">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
