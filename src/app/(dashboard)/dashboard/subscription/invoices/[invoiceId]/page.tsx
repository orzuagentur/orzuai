import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getStripeInvoiceDetail } from "@/services/stripe.service";
import type { BillingInvoiceDetail } from "@/types/billing.types";

type InvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function InvoiceDetailView({ invoice }: { invoice: BillingInvoiceDetail }) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Invoice {invoice.number ?? invoice.id.slice(-8)}
          </h2>
          <p className="text-sm text-muted-foreground capitalize">
            {invoice.status} · {formatDate(invoice.createdAt)}
          </p>
        </div>
        <Link
          href={DASHBOARD_ROUTES.subscriptionInvoices}
          className="text-sm text-primary hover:underline"
        >
          ← All invoices
        </Link>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription>
            Billing period {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatAmount(invoice.subtotalCents, invoice.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatAmount(invoice.taxCents, invoice.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatAmount(invoice.amountPaidCents, invoice.currency)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Description</th>
                  <th className="pb-2 pr-4 font-medium">Qty</th>
                  <th className="pb-2 pr-4 font-medium">Period</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((line) => (
                  <tr key={line.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">{line.description}</td>
                    <td className="py-3 pr-4 tabular-nums">{line.quantity}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(line.periodStart)} – {formatDate(line.periodEnd)}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatAmount(line.amountCents, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const invoice = await getStripeInvoiceDetail(invoiceId);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailView invoice={invoice} />;
}
