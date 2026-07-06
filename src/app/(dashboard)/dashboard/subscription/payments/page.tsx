import { Suspense } from "react";

import { BillingInvoicesTable } from "@/components/billing/BillingInvoicesTable";
import { DashboardPageSkeleton } from "@/components/dashboard/DashboardPageSkeleton";
import { DashboardSetupPrompt } from "@/components/dashboard/DashboardSetupPrompt";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import { getSubscriptionPageData } from "@/services/subscription.service";

export default function BillingPaymentsPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={2} />}>
      <BillingPaymentsPageContent />
    </Suspense>
  );
}

async function BillingPaymentsPageContent() {
  const data = await getSubscriptionPageData();

  if (!data.hasBusiness) {
    return (
      <DashboardSetupPrompt
        title={BILLING_MESSAGES.pageTitle}
        description="Create your business profile to view payments."
      />
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h2 className="text-lg font-semibold">{BILLING_MESSAGES.paymentsTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {BILLING_MESSAGES.paymentsDescription}
        </p>
      </div>
      <BillingInvoicesTable invoices={data.recentInvoices} />
    </div>
  );
}
