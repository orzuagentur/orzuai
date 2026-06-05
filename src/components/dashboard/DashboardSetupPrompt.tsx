import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { OVERVIEW_MESSAGES } from "@/features/dashboard/constants";

type DashboardSetupPromptProps = {
  title: string;
  description?: string;
};

export function DashboardSetupPrompt({
  title,
  description = OVERVIEW_MESSAGES.emptyBusinessDescription,
}: DashboardSetupPromptProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{OVERVIEW_MESSAGES.emptyBusinessTitle}</CardTitle>
          <CardDescription>{OVERVIEW_MESSAGES.emptyBusinessDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.onboarding}>Start setup wizard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
