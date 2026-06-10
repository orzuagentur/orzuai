import Link from "next/link";
import { Suspense } from "react";

import { AutomationsHub } from "@/components/automations/AutomationsHub";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getAutomationsPageData } from "@/services/automations.service";

export default function AutomationsPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <AutomationsPageContent />
    </Suspense>
  );
}

async function AutomationsPageContent() {
  const data = await getAutomationsPageData();

  if (!data.hasBusiness) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="mx-auto max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>Set up your business</CardTitle>
            <CardDescription>
              Create your business profile before building automations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.settings}>Go to settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AutomationsHub
      automations={data.automations}
      usage={data.usage}
      salesAgent={data.salesAgent}
      followUpAgent={data.followUpAgent}
    />
  );
}
