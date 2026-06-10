import { Suspense } from "react";

import { AutomationsCommandCenter } from "@/components/automations/AutomationsCommandCenter";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import { getAutomationsPageData } from "@/services/automations.service";

type AutomationsPageProps = {
  searchParams: Promise<{
    tab?: string;
    rule?: string;
    workflow?: string;
    step?: string;
  }>;
};

export default function AutomationsPage({ searchParams }: AutomationsPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AutomationsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AutomationsPageContent({ searchParams }: AutomationsPageProps) {
  const params = await searchParams;
  const data = await getAutomationsPageData(params);

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={AUTOMATIONS_MESSAGES.pageTitle}
        description={AUTOMATIONS_MESSAGES.pageDescription}
      />
    );
  }

  return <AutomationsCommandCenter data={data} />;
}
