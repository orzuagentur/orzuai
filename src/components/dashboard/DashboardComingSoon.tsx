import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_COMING_SOON_MESSAGE } from "@/features/dashboard/constants";

type DashboardComingSoonProps = {
  title: string;
  description?: string;
};

export function DashboardComingSoon({
  title,
  description = DASHBOARD_COMING_SOON_MESSAGE,
}: DashboardComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            This section will be available in an upcoming phase of the MVP
            roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Continue building your business profile and integrations while we
            prepare this workspace.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
