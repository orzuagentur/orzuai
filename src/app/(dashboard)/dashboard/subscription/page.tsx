import { Suspense } from "react";

import { SubscriptionHub } from "@/components/subscription/SubscriptionHub";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { getSubscriptionPageData } from "@/services/subscription.service";

export default async function SubscriptionPage() {
  const data = await getSubscriptionPageData();

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title="Subscription & Billing"
        description="Create your business profile to manage plans and payment methods."
      />
    );
  }

  return (
    <Suspense fallback={<SubscriptionFallback />}>
      <SubscriptionHub data={data} />
    </Suspense>
  );
}

function SubscriptionFallback() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-48 animate-pulse rounded-xl border bg-muted/30" />
    </div>
  );
}
