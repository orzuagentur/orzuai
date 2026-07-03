"use client";

import { CheckIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";
import { Button } from "@/components/ui/button";
import {
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_PLANS,
} from "@/features/subscription/plans";
import { cn } from "@/lib/utils";

type LandingPricingProps = {
  onStartFree: () => void;
};

export function LandingPricing({ onStartFree }: LandingPricingProps) {
  const { copy } = useLandingLocale();

  return (
    <section id="pricing" className="w-full bg-[#f7f9f6] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <LandingReveal>
            <p className="text-xs font-semibold uppercase text-[#1e6f5c]">
              {copy.pricing.eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#101815] sm:text-5xl">
              {copy.pricing.title}
            </h2>
          </LandingReveal>
          <LandingReveal delay={0.05}>
            <p className="text-base leading-8 text-[#52625a] sm:text-lg">
              {copy.pricing.subtitle}
            </p>
          </LandingReveal>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PLAN_IDS.map((planId) => {
            const plan = SUBSCRIPTION_PLANS[planId];
            const highlighted = Boolean(plan.highlighted);
            const priceLabel =
              plan.priceMonthly === 0
                ? copy.pricing.freeLabel
                : `$${plan.priceMonthly}`;

            return (
              <article
                key={planId}
                className={cn(
                  "relative flex min-h-[520px] flex-col rounded-lg border bg-white p-5 shadow-[0_1px_0_rgba(24,36,30,0.04)]",
                  highlighted
                    ? "border-[#1e6f5c] ring-1 ring-[#1e6f5c]"
                    : "border-[#d9e3dc]",
                )}
              >
                {highlighted ? (
                  <span className="absolute right-4 top-4 rounded-full bg-[#e2f5ee] px-2.5 py-1 text-xs font-semibold text-[#1e6f5c]">
                    {copy.pricing.highlight}
                  </span>
                ) : null}

                <div className="pr-24">
                  <h3 className="text-xl font-semibold text-[#101815]">{plan.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5a6961]">{plan.tagline}</p>
                </div>

                <p className="mt-7 text-4xl font-semibold text-[#101815]">
                  {priceLabel}
                  {plan.priceMonthly > 0 ? (
                    <span className="text-sm font-normal text-[#69766f]">
                      {copy.pricing.perMonth}
                    </span>
                  ) : null}
                </p>

                <ul className="mt-7 flex-1 space-y-3" aria-label={`${plan.label} features`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-[#4f5f57]">
                      <CheckIcon className="mt-1 size-4 shrink-0 text-[#1e6f5c]" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  className={cn(
                    "mt-7 h-11 w-full rounded-full",
                    highlighted || planId === "free"
                      ? "bg-[#101815] text-white hover:bg-[#24332c]"
                      : "border border-[#d9e3dc] bg-white text-[#101815] hover:bg-[#edf3ef]",
                  )}
                  variant={highlighted || planId === "free" ? "default" : "outline"}
                  onClick={onStartFree}
                >
                  {copy.pricing.startCta}
                </Button>
              </article>
            );
          })}
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-6 text-[#69766f]">
          {copy.pricing.note}
        </p>
      </div>
    </section>
  );
}
