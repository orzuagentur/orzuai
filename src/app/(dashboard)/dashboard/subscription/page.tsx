import { Suspense } from "react";

import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { SubscriptionHub } from "@/components/subscription/SubscriptionHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
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
        title="Subscription & Billing"
        description="Create your business profile to manage plans and payment methods."
      />
    );
  }

  return <SubscriptionHub data={data} />;
}
