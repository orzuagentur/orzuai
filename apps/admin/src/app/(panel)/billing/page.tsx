import { BillingPanel } from "@/components/billing/BillingPanel";
import { fetchBillingOverviewAction } from "@/features/billing/actions";

export default async function BillingPage() {
  const result = await fetchBillingOverviewAction();

  if (!result.success) {
    return (
      <div className="rounded-xl border bg-destructive/10 p-6 text-sm text-destructive">
        {result.message}
      </div>
    );
  }

  return (
    <BillingPanel
      initialStats={result.stats}
      initialAccounts={result.accounts}
      initialByPlan={result.byPlan}
    />
  );
}
