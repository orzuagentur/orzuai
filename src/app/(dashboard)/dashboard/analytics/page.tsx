import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AnalyticsCommandCenter } from "@/components/analytics/AnalyticsCommandCenter";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import { getAnalyticsPageData } from "@/services/analytics.service";
import {
  buildAnalyticsHref,
  isAnalyticsPeriod,
} from "@/utils/analytics-url";

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

  if (params.tab || params.channel) {
    redirect(
      buildAnalyticsHref({
        period:
          params.period && isAnalyticsPeriod(params.period)
            ? params.period
            : params.period === "all"
              ? "30d"
              : "7d",
      }),
    );
  }

  if (params.period === "all") {
    redirect(buildAnalyticsHref({ period: "30d" }));
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
