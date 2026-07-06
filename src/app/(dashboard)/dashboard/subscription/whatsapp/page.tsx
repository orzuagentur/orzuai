import { Suspense } from "react";

import { BillingWhatsAppPanel } from "@/components/billing/BillingWhatsAppPanel";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { getWhatsAppBillingPageData } from "@/services/billing-whatsapp.service";
import { getSubscriptionPageData } from "@/services/subscription.service";

export default function BillingWhatsAppPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <BillingWhatsAppPageContent />
    </Suspense>
  );
}

async function BillingWhatsAppPageContent() {
  const whatsappData = await getWhatsAppBillingPageData();
  const subscriptionData = await getSubscriptionPageData();

  if (!subscriptionData.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={BILLING_MESSAGES.pageTitle}
        description="Create your business profile to manage billing and subscriptions."
      />
    );
  }

  return <BillingWhatsAppPanel data={whatsappData} />;
}
