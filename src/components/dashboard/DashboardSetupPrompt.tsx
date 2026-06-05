import { EmptyState } from "@/components/ui/empty-state";
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
        <h1 className="text-h1">{title}</h1>
        <p className="text-body text-muted-foreground">{description}</p>
      </div>

      <EmptyState
        variant="setup"
        title={OVERVIEW_MESSAGES.emptyBusinessTitle}
        description={OVERVIEW_MESSAGES.emptyBusinessDescription}
        actionLabel="Start setup wizard"
        actionHref={DASHBOARD_ROUTES.onboarding}
        className="max-w-2xl"
      />
    </div>
  );
}
