import { Suspense } from "react";

import { BillingUsagePanel } from "@/components/billing/BillingUsagePanel";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { getUsageSpendingPageData } from "@/services/billing-usage.service";

export default function BillingUsagePage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={4} />}>
      <BillingUsagePageContent />
    </Suspense>
  );
}

async function BillingUsagePageContent() {
  const data = await getUsageSpendingPageData();

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={BILLING_MESSAGES.pageTitle}
        description="Create your business profile to view usage and spending."
      />
    );
  }

  return <BillingUsagePanel data={data} />;
}
