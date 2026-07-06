import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BILLING_MESSAGES } from "@/features/billing/constants";
import type { BillingInvoiceItem } from "@/types/billing.types";

type BillingInvoicesTableProps = {
  invoices: BillingInvoiceItem[];
};

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BillingInvoicesTable({ invoices }: BillingInvoicesTableProps) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{BILLING_MESSAGES.invoicesTitle}</CardTitle>
        <CardDescription>{BILLING_MESSAGES.invoicesDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {BILLING_MESSAGES.invoicesEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Invoice</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">{formatDate(invoice.createdAt)}</td>
                    <td className="py-3 pr-4">{invoice.number ?? invoice.id.slice(-8)}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {formatAmount(
                        invoice.amountPaidCents || invoice.amountDueCents,
                        invoice.currency,
                      )}
                    </td>
                    <td className="py-3 pr-4 capitalize">{invoice.status}</td>
                    <td className="py-3 text-right">
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {BILLING_MESSAGES.invoicesView}
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
