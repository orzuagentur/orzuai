import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AnalyticsHub } from "@/components/analytics/AnalyticsHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import { getAnalyticsPageData } from "@/services/analytics.service";

type AnalyticsPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AnalyticsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AnalyticsPageContent({ searchParams }: AnalyticsPageProps) {
  const { channel } = await searchParams;

  if (
    channel &&
    !isMessagingIntegrationChannel(channel as IntegrationChannelId)
  ) {
    redirect(`${DASHBOARD_ROUTES.analytics}?channel=whatsapp`);
  }

  const data = await getAnalyticsPageData(channel ?? "whatsapp");

  if (!data.hasBusiness) {
    return <DashboardSetupPrompt title="Analytics" />;
  }

  return <AnalyticsHub data={data} />;
}
