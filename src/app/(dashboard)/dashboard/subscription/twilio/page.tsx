import { Suspense } from "react";

import { BillingTwilioPanel } from "@/components/billing/BillingTwilioPanel";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { getTwilioBillingPageData } from "@/services/billing-twilio-page.service";
import { getSubscriptionPageData } from "@/services/subscription.service";

export default function BillingTwilioPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <BillingTwilioPageContent />
    </Suspense>
  );
}

async function BillingTwilioPageContent() {
  const [twilioData, subscriptionData] = await Promise.all([
    getTwilioBillingPageData(),
    getSubscriptionPageData(),
  ]);

  if (!subscriptionData.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={BILLING_MESSAGES.pageTitle}
        description="Create your business profile to manage billing and subscriptions."
      />
    );
  }

  return (
    <BillingTwilioPanel
      data={twilioData}
      invoices={subscriptionData.recentInvoices}
      hasActivePaidSubscription={subscriptionData.hasActivePaidSubscription}
    />
  );
}
