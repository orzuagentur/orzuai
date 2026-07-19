"use client";

import { CheckIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LandingPlanCard = {
  id: string;
  label: string;
  tagline: string;
  priceMonthly: number;
  highlighted: boolean;
  features: string[];
};

type LandingPricingProps = {
  onStartFree: () => void;
  plans: LandingPlanCard[];
};

export function LandingPricing({ onStartFree, plans }: LandingPricingProps) {
  const { copy } = useLandingLocale();

  return (
    <section id="pricing" className="w-full bg-white/28 px-4 py-8 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:gap-8">
          <LandingReveal>
            <p className="landing-eyebrow">{copy.pricing.eyebrow}</p>
            <h2 className="landing-heading mt-3 text-2xl font-semibold leading-tight sm:mt-4 sm:text-5xl">
              {copy.pricing.title}
            </h2>
          </LandingReveal>
          <LandingReveal delay={0.05}>
            <p className="landing-copy text-sm leading-6 sm:text-lg sm:leading-8">
              {copy.pricing.subtitle}
            </p>
          </LandingReveal>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-1.5 sm:mt-12 sm:gap-3 lg:gap-4">
          {plans.map((plan) => {
            const highlighted = Boolean(plan.highlighted);
            const priceLabel = `$${plan.priceMonthly}`;

            return (
              <article
                key={plan.id}
                className={cn(
                  "landing-panel landing-panel-hover relative flex min-h-0 flex-col rounded-lg p-2 sm:rounded-xl sm:p-4 lg:min-h-[560px] lg:rounded-[var(--radius-lg)] lg:p-6",
                  highlighted
                    ? "border-[var(--landing-teal)] ring-1 ring-[var(--landing-teal)]"
                    : "border-[var(--landing-line)]",
                )}
              >
                {highlighted ? (
                  <span className="absolute right-1 top-1 rounded bg-[var(--landing-warm)] px-1 py-0.5 text-[8px] font-semibold text-[#8a3f31] sm:right-3 sm:top-3 sm:rounded-md sm:px-2 sm:text-[10px] lg:text-xs">
                    {copy.pricing.highlight}
                  </span>
                ) : null}

                <div className={cn(highlighted && "pr-6 sm:pr-12")}>
                  <h3 className="text-[11px] font-semibold leading-tight text-[var(--landing-ink)] sm:text-base lg:text-xl">
                    {plan.label}
                  </h3>
                  <p className="landing-copy mt-1 line-clamp-2 text-[9px] leading-3 sm:mt-2 sm:line-clamp-none sm:text-xs sm:leading-5 lg:text-sm lg:leading-6">
                    {plan.tagline}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--landing-ink)] sm:mt-3 sm:text-2xl lg:mt-5 lg:text-4xl">
                    {priceLabel}
                    <span className="text-[8px] font-normal text-[var(--landing-muted-text)] sm:text-xs lg:text-sm">
                      {copy.pricing.perMonth}
                    </span>
                  </p>
                </div>

                <ul
                  className="mt-2 flex-1 space-y-1 sm:mt-4 sm:space-y-2 lg:mt-6 lg:space-y-3"
                  aria-label={`${plan.label} features`}
                >
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="landing-copy flex items-start gap-1 text-[8px] leading-3 sm:gap-1.5 sm:text-xs sm:leading-5 lg:gap-2 lg:text-sm lg:leading-6"
                    >
                      <CheckIcon
                        className="mt-0.5 size-2.5 shrink-0 text-[var(--landing-teal)] sm:size-3.5 lg:mt-1 lg:size-4"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  className={cn(
                    "mt-2 h-7 w-full rounded-md text-[9px] sm:mt-4 sm:h-10 sm:rounded-xl sm:text-xs lg:mt-6 lg:h-11 lg:text-sm",
                    highlighted
                      ? "bg-[var(--landing-primary)] text-white hover:bg-[#1d5148]"
                      : "border border-[var(--landing-line)] bg-white text-[var(--landing-ink)] hover:bg-[var(--landing-soft)]",
                  )}
                  variant={highlighted ? "default" : "outline"}
                  onClick={onStartFree}
                >
                  {copy.pricing.subscribeCta}
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
