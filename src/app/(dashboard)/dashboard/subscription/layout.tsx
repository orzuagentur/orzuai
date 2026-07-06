import { BillingShell } from "@/components/billing/BillingShell";

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BillingShell>{children}</BillingShell>;
}
