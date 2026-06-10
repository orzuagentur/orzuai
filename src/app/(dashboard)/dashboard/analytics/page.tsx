import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AnalyticsCommandCenter } from "@/components/analytics/AnalyticsCommandCenter";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import {
  isMessagingIntegrationChannel,
  type IntegrationChannelId,
} from "@/features/integrations";
import { getAnalyticsPageData } from "@/services/analytics.service";
import type { MessagingChannel } from "@/types/database.types";
import { buildAnalyticsHref } from "@/utils/analytics-url";

type AnalyticsPageProps = {
  searchParams: Promise<{
    tab?: string;
    period?: string;
    channel?: string;
  }>;
};

export default function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <AnalyticsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AnalyticsPageContent({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;

  if (
    params.channel &&
    !isMessagingIntegrationChannel(params.channel as IntegrationChannelId)
  ) {
    redirect(buildAnalyticsHref({ tab: "channels" }));
  }

  if (params.channel && !params.tab) {
    redirect(
      buildAnalyticsHref({
        tab: "channels",
        channel: params.channel as MessagingChannel,
        period: params.period === "30d" || params.period === "all" ? params.period : "7d",
      }),
    );
  }

  const data = await getAnalyticsPageData(params);

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={ANALYTICS_MESSAGES.pageTitle}
        description={ANALYTICS_MESSAGES.pageDescription}
      />
    );
  }

  return <AnalyticsCommandCenter data={data} />;
}
