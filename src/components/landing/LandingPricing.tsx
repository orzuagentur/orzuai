import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LANDING_PRICING } from "@/features/landing/constants";
import { cn } from "@/lib/utils";

type LandingPricingProps = {
  onStartFree: () => void;
};

export function LandingPricing({ onStartFree }: LandingPricingProps) {
  return (
    <section className="relative z-10 w-full max-w-5xl px-6 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {LANDING_PRICING.title}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {LANDING_PRICING.subtitle}
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {LANDING_PRICING.plans.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              "flex flex-col rounded-2xl border p-6 backdrop-blur-sm",
              plan.highlighted
                ? "border-primary/40 bg-primary/10 shadow-lg shadow-primary/10"
                : "border-white/10 bg-white/5",
            )}
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            <p className="mt-6">
              <span className="text-4xl font-semibold tracking-tight">
                {plan.price}
              </span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-8 w-full rounded-full"
              variant={plan.highlighted ? "default" : "secondary"}
              disabled={!plan.highlighted}
              onClick={plan.highlighted ? onStartFree : undefined}
            >
              {plan.cta}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
