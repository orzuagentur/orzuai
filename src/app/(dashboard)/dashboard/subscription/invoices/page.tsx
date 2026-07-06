import { Suspense } from "react";

import { BillingInvoicesTable } from "@/components/billing/BillingInvoicesTable";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { getSubscriptionPageData } from "@/services/subscription.service";

export default function BillingInvoicesPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <BillingInvoicesPageContent />
    </Suspense>
  );
}

async function BillingInvoicesPageContent() {
  const data = await getSubscriptionPageData();

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={BILLING_MESSAGES.pageTitle}
        description="Create your business profile to view invoices."
      />
    );
  }

  return (
    <div className="p-4 md:p-6">
      <BillingInvoicesTable invoices={data.recentInvoices} />
    </div>
  );
}
