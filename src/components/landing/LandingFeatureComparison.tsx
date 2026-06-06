"use client";

import { CheckIcon, MinusIcon } from "lucide-react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LANDING_FEATURE_COMPARISON } from "@/features/landing/constants";
import { cn } from "@/lib/utils";

type CellValue = boolean | "partial";

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-primary">
        <CheckIcon className="size-4" />
        Yes
      </span>
    );
  }

  if (value === "partial") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <MinusIcon className="size-4" />
        Partial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <MinusIcon className="size-4" />
      No
    </span>
  );
}

export function LandingFeatureComparison() {
  const { copy } = useLandingLocale();

  return (
    <section className="relative z-10 w-full max-w-4xl px-6 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.comparison.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {copy.comparison.subtitle}
        </p>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Feature
              </th>
              {LANDING_FEATURE_COMPARISON.columns.map((column, index) => (
                <th
                  key={column}
                  className={cn(
                    "px-4 py-3 font-semibold",
                    index === 0 ? "text-primary" : "text-foreground",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LANDING_FEATURE_COMPARISON.rows.map((row) => (
              <tr
                key={row.feature}
                className="border-b border-white/5 last:border-0"
              >
                <td className="px-4 py-3 text-foreground">{row.feature}</td>
                <td className="px-4 py-3">
                  <ComparisonCell value={row.orzuai} />
                </td>
                <td className="px-4 py-3">
                  <ComparisonCell value={row.manychat} />
                </td>
                <td className="px-4 py-3">
                  <ComparisonCell value={row.intercom} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
