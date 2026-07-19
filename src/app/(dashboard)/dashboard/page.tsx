import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AnalyticsCardsGrid } from "@/components/dashboard/AnalyticsCardsGrid";
import { DashboardActivityPanel } from "@/components/dashboard/DashboardActivityPanel";
import { DashboardChartCalendarRow } from "@/components/dashboard/DashboardChartCalendarRow";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardRecentCallsCard } from "@/components/dashboard/DashboardRecentCallsCard";
import { DashboardRecentDealsCard } from "@/components/dashboard/DashboardRecentDealsCard";
import { MultiChannelMetricsPanel } from "@/components/dashboard/MultiChannelMetricsPanel";
import { PushNotificationsBanner } from "@/components/pwa/PushNotificationsBanner";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getDashboardOverview } from "@/services/analytics.service";
import { getAnalyticsSeries } from "@/services/analytics-series.service";
import { getCurrentUser } from "@/services/auth.service";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getDashboardCardMetricValues } from "@/services/dashboard-home-metrics.service";
import { getDashboardHomeSideData } from "@/services/dashboard-home-side.service";
import { getPendingTeamOnboardingForUser } from "@/services/team-invite.service";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={4} />}>
      <DashboardPageContent />
    </Suspense>
  );
}

async function DashboardPageContent() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    redirect(DASHBOARD_ROUTES.onboarding);
  }

  const [ownedBusiness, accessibleBusiness, pendingTeamOnboarding] =
    await Promise.all([
      getPrimaryBusiness(authUser.id),
      getAccessibleBusiness(authUser.id),
      getPendingTeamOnboardingForUser(authUser.id),
    ]);

  if (pendingTeamOnboarding.needsOnboarding && !ownedBusiness) {
    redirect(DASHBOARD_ROUTES.teamOnboarding);
  }

  if (!accessibleBusiness) {
    redirect(DASHBOARD_ROUTES.onboarding);
  }

  if (!ownedBusiness) {
    redirect(DASHBOARD_ROUTES.chats);
  }

  const business = accessibleBusiness;

  const [overview, messageSeries, cardMetrics, sideData] = await Promise.all([
    getDashboardOverview(),
    getAnalyticsSeries(business.id, "messages", 7),
    getDashboardCardMetricValues(business.id, "week"),
    getDashboardHomeSideData(business.id),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 pb-4 sm:gap-6 sm:p-4 md:p-6">
      <PwaInstallBanner />
      <PushNotificationsBanner />

      <AnalyticsCardsGrid
        initialPeriod="week"
        initialValues={cardMetrics}
      />

      <MultiChannelMetricsPanel channels={overview.channelMetrics} />

      <DashboardChartCalendarRow
        eventDayKeys={sideData.eventDayKeys}
        chart={
          <DashboardActivityPanel
            initialPoints={messageSeries}
            initialPeriod="week"
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentConversations conversations={overview.recentConversations} />
        <div className="grid gap-4">
          <DashboardRecentCallsCard calls={sideData.recentCalls} />
          <DashboardRecentDealsCard deals={sideData.recentDeals} />
        </div>
      </div>
    </div>
  );
}
