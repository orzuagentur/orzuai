"use client";

import { motion } from "framer-motion";

import { LivePlatformSurface } from "@/components/landing/live-demo";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";

type LandingMinimalHeroProps = {
  onStartFree: () => void;
};

export function LandingMinimalHero({ onStartFree: _onStartFree }: LandingMinimalHeroProps) {
  const { copy } = useLandingLocale();

  return (
    <section
      id="live-platform"
      className="relative isolate w-full overflow-hidden px-4 pb-6 pt-6 sm:px-6 sm:pb-16 sm:pt-12 lg:pb-20"
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
            className="mt-3 text-[1.75rem] font-semibold leading-[1.08] text-[var(--landing-ink)] sm:mt-5 sm:text-5xl lg:text-6xl"
          >
            {copy.hero.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.42 }}
            className="landing-copy mx-auto mt-2 max-w-3xl text-sm leading-5 sm:mt-5 sm:text-lg sm:leading-8"
          >
            {copy.hero.subtitle}
          </motion.p>
        </div>

        <div className="lg:hidden">
          <LivePlatformSurface compact />
        </div>
        <div className="hidden lg:block">
          <LivePlatformSurface />
        </div>

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
