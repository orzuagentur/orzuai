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
    <section id="pricing" className="w-full bg-white/28 px-4 py-12 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <LandingReveal>
            <p className="landing-eyebrow">{copy.pricing.eyebrow}</p>
            <h2 className="landing-heading mt-4 text-3xl font-semibold leading-tight sm:text-5xl">
              {copy.pricing.title}
            </h2>
          </LandingReveal>
          <LandingReveal delay={0.05}>
            <p className="landing-copy text-base leading-8 sm:text-lg">
              {copy.pricing.subtitle}
            </p>
          </LandingReveal>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const highlighted = Boolean(plan.highlighted);
            const priceLabel =
              plan.priceMonthly === 0
                ? copy.pricing.freeLabel
                : `$${plan.priceMonthly}`;

            return (
              <article
                key={plan.id}
                className={cn(
                  "landing-panel relative flex min-h-0 flex-col p-5 sm:min-h-[520px]",
                  highlighted
                    ? "border-[var(--landing-teal)] ring-1 ring-[var(--landing-teal)]"
                    : "border-[var(--landing-line)]",
                )}
              >
                {highlighted ? (
                  <span className="absolute right-4 top-4 rounded-full bg-[var(--landing-warm)] px-2.5 py-1 text-xs font-semibold text-[#8a3f31]">
                    {copy.pricing.highlight}
                  </span>
                ) : null}

                <div className="pr-24">
                  <h3 className="text-xl font-semibold text-[var(--landing-ink)]">
                    {plan.label}
                  </h3>
                  <p className="landing-copy mt-2 text-sm leading-6">{plan.tagline}</p>
                </div>

                <p className="mt-7 text-4xl font-semibold text-[var(--landing-ink)]">
                  {priceLabel}
                  {plan.priceMonthly > 0 ? (
                    <span className="text-sm font-normal text-[var(--landing-muted-text)]">
                      {copy.pricing.perMonth}
                    </span>
                  ) : null}
                </p>

                <ul
                  className="mt-7 flex-1 space-y-3"
                  aria-label={`${plan.label} features`}
                >
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="landing-copy flex items-start gap-2 text-sm leading-6"
                    >
                      <CheckIcon
                        className="mt-1 size-4 shrink-0 text-[var(--landing-teal)]"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  className={cn(
                    "mt-7 h-11 w-full rounded-full",
                    highlighted || plan.id === "free"
                      ? "bg-[var(--landing-primary)] text-white hover:bg-[#1d5148]"
                      : "border border-[var(--landing-line)] bg-white text-[var(--landing-ink)] hover:bg-[var(--landing-soft)]",
                  )}
                  variant={
                    highlighted || plan.id === "free" ? "default" : "outline"
                  }
                  onClick={onStartFree}
                >
                  {copy.pricing.startCta}
                </Button>
              </article>
            );
          })}
        </div>

        <p className="landing-copy mt-5 max-w-3xl text-sm leading-6">
          {copy.pricing.note}
        </p>
      </div>
    </section>
  );
}
