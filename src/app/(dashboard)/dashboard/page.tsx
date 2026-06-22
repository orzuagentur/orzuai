import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { AiStatusCard } from "@/components/dashboard/AiStatusCard";
import { AnalyticsCardsGrid } from "@/components/dashboard/AnalyticsCardsGrid";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { MultiChannelMetricsPanel } from "@/components/dashboard/MultiChannelMetricsPanel";
import { PushNotificationsBanner } from "@/components/pwa/PushNotificationsBanner";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { SetupChecklist } from "@/components/onboarding/SetupChecklist";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentConversations } from "@/components/dashboard/RecentConversations";
import { WhatsAppStatusCard } from "@/components/dashboard/WhatsAppStatusCard";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations";
import { getDashboardOverview } from "@/services/analytics.service";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";
import { getOnboardingProgress } from "@/services/onboarding.service";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={4} />}>
      <DashboardPageContent />
    </Suspense>
  );
}

async function DashboardPageContent() {
  const authUser = await getCurrentUser();
  const business = authUser ? await getPrimaryBusiness(authUser.id) : null;

  if (!business) {
    redirect(DASHBOARD_ROUTES.onboarding);
  }

  const [overview, channelStatuses, onboardingProgress] = await Promise.all([
    getDashboardOverview(),
    getChannelConnectionStatuses(business.id),
    getOnboardingProgress(business.id),
  ]);

  const hasConnectedChannel = MESSAGING_INTEGRATION_CHANNELS.some(
    (channel) => channelStatuses[channel]?.status === "connected",
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <PwaInstallBanner />
      <PushNotificationsBanner />

      {!onboardingProgress.isComplete ? (
        <SetupChecklist progress={onboardingProgress} />
      ) : null}

      <AnalyticsCardsGrid metrics={overview.metrics} />

      <MultiChannelMetricsPanel channels={overview.channelMetrics} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityChart data={overview.activity} />
        </div>
        <QuickActions enabled={hasConnectedChannel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentConversations conversations={overview.recentConversations} />
        <div className="grid gap-4">
          <WhatsAppStatusCard
            status={overview.whatsappStatus}
            phoneNumber={overview.whatsappPhoneNumber}
          />
          <AiStatusCard aiEnabled={overview.aiEnabled} />
        </div>
      </div>
    </div>
  );
}
