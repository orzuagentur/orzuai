"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRightIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { completeTeamOnboardingAction } from "@/features/team/actions/team-onboarding-actions";
import type { TeamRoleOnboardingContent } from "@/features/team/onboarding-content";
import { roleLabel } from "@/features/team/permissions";
import type { TeamRole } from "@/features/team/types";

type TeamMemberOnboardingProps = {
  role: TeamRole;
  businessName: string | null;
  content: TeamRoleOnboardingContent;
};

export function TeamMemberOnboarding({
  role,
  businessName,
  content,
}: TeamMemberOnboardingProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = content.steps[stepIndex] ?? content.steps[0]!;
  const isLastStep = stepIndex >= content.steps.length - 1;

  function handleComplete() {
    startTransition(async () => {
      const result = await completeTeamOnboardingAction();

      if (!result.success) {
        return;
      }

      router.push(content.primaryHref);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
      <Card className="overflow-hidden border-primary/20 shadow-none">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background px-6 py-8">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2Icon className="size-6" />
          </div>
          <p className="text-sm font-medium text-primary">
            {businessName ? `${businessName} · ${roleLabel(role)}` : roleLabel(role)}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {content.headline}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {content.summary}
          </p>
        </div>
        <CardHeader className="border-t">
          <CardTitle className="text-base">What you can do</CardTitle>
          <CardDescription>Your role on this workspace includes:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {content.capabilities.map((item) => (
              <li key={item} className="flex gap-2 text-sm">
                <span className="mt-0.5 text-primary">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            Step {stepIndex + 1} of {content.steps.length}
          </CardTitle>
          <CardDescription>{currentStep.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {currentStep.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {stepIndex > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepIndex((value) => value - 1)}
                disabled={isPending}
              >
                Back
              </Button>
            ) : null}

            {!isLastStep ? (
              <Button
                type="button"
                onClick={() => setStepIndex((value) => value + 1)}
                disabled={isPending}
              >
                Next
                <ArrowRightIcon className="size-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleComplete} disabled={isPending}>
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  content.primaryCta
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <button
          type="button"
          className="underline"
          disabled={isPending}
          onClick={handleComplete}
        >
          Skip for now
        </button>
      </p>
    </div>
  );
}
