import Link from "next/link";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { OnboardingProgressRing } from "@/components/onboarding/OnboardingProgressRing";
import { ONBOARDING_MESSAGES } from "@/features/onboarding/constants";
import type { OnboardingProgress } from "@/services/onboarding.service";

type SetupChecklistProps = {
  progress: OnboardingProgress;
};

export function SetupChecklist({ progress }: SetupChecklistProps) {
  const items = [
    {
      label: "Create business profile",
      done: progress.hasBusiness,
      href: DASHBOARD_ROUTES.onboarding,
    },
    {
      label: "Connect a messaging channel",
      done: progress.hasConnectedChannel,
      href: `${DASHBOARD_ROUTES.onboarding}?step=2`,
    },
    {
      label: "Add knowledge (optional)",
      done: progress.hasKnowledgeEntry,
      href: DASHBOARD_ROUTES.knowledgeBase,
    },
    {
      label: "Enable AI auto-replies",
      done: progress.hasAiEnabled,
      href: progress.connectedChannel
        ? `${DASHBOARD_ROUTES.aiAssistant}?channel=${progress.connectedChannel}`
        : DASHBOARD_ROUTES.onboarding,
    },
  ];

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <OnboardingProgressRing percent={progress.percentComplete} size={64} />
          <div className="space-y-1">
            <CardTitle>{ONBOARDING_MESSAGES.checklistTitle}</CardTitle>
            <CardDescription>{ONBOARDING_MESSAGES.checklistDescription}</CardDescription>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={DASHBOARD_ROUTES.onboarding}>Resume setup</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3 text-sm">
              {item.done ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
              ) : (
                <CircleIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <Link
                href={item.href}
                className={
                  item.done
                    ? "text-muted-foreground line-through"
                    : "font-medium hover:underline"
                }
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
