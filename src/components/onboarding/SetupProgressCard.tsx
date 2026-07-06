"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
} from "lucide-react";

import { OnboardingProgressRing } from "@/components/onboarding/OnboardingProgressRing";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  buildSetupSteps,
  getRequiredSetupSteps,
  getSetupProgressLabel,
} from "@/features/onboarding/setup-steps";
import { cn } from "@/lib/utils";
import type { OnboardingProgress } from "@/services/onboarding.service";

type SetupProgressCardProps = {
  progress: OnboardingProgress;
};

export function SetupProgressCard({ progress }: SetupProgressCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (progress.isComplete) {
    return null;
  }

  const steps = buildSetupSteps(progress);
  const requiredSteps = getRequiredSetupSteps(steps);
  const remainingRequired = requiredSteps.filter((step) => !step.done);
  const { title, description } = getSetupProgressLabel();

  return (
    <div
      className={cn(
        "fixed bottom-24 right-4 z-[48] w-[min(100vw-2rem,20rem)]",
        "rounded-xl border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 p-3 text-left"
        aria-expanded={expanded}
      >
        <OnboardingProgressRing percent={progress.percentComplete} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {remainingRequired.length > 0
              ? `${remainingRequired.length} required step${remainingRequired.length === 1 ? "" : "s"} left`
              : description}
          </p>
        </div>
        {expanded ? (
          <ChevronUpIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <div className="border-t px-3 pb-3 pt-2">
          <ul className="space-y-2">
            {steps.map((step) => {
              if (step.done && step.required) {
                return null;
              }

              return (
                <li key={step.id} className="flex items-start gap-2 text-sm">
                  {step.done ? (
                    <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  ) : (
                    <CircleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <Link
                    href={step.href}
                    className={cn(
                      "leading-snug hover:underline",
                      step.done
                        ? "text-muted-foreground line-through"
                        : "font-medium",
                      !step.required && !step.done && "text-muted-foreground",
                    )}
                  >
                    {step.label}
                    {!step.required ? " (optional)" : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Button asChild size="sm" className="mt-3 w-full">
            <Link href={DASHBOARD_ROUTES.onboarding}>Continue setup</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
