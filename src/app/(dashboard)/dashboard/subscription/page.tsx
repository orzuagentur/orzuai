import { Suspense } from "react";

import { BillingOverviewPanel } from "@/components/billing/BillingOverviewPanel";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { getSubscriptionPageData } from "@/services/subscription.service";

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <SubscriptionPageContent />
    </Suspense>
  );
}

async function SubscriptionPageContent() {
  const data = await getSubscriptionPageData();

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={BILLING_MESSAGES.pageTitle}
        description="Create your business profile to manage billing and subscriptions."
      />
    );
  }

  return <BillingOverviewPanel data={data} />;
}
