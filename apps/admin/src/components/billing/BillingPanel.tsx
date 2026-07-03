"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowUpRightIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchBillingOverviewAction } from "@/features/billing/actions";
import type { BillingAccountRow, BillingOverviewStats } from "@/features/billing/types";
import {
  estimateBusinessMrr,
  subscriptionStatusLabel,
  subscriptionStatusTone,
} from "@/features/billing/types";
import { planLabel } from "@/features/businesses/types";
import {
  getStripeCustomerDashboardUrl,
  getStripeDashboardHomeUrl,
  getStripeSubscriptionDashboardUrl,
} from "@/lib/stripe-dashboard";
import { formatAdminDateTime } from "@/lib/format-datetime";
import { buildCsvContent, downloadCsv } from "@/lib/csv-download";

type BillingPanelProps = {
  initialStats: BillingOverviewStats;
  initialAccounts: BillingAccountRow[];
  initialByPlan: Array<{ plan: string; label: string; count: number; revenueUsd: number }>;
};

export function BillingPanel({
  initialStats,
  initialAccounts,
  initialByPlan,
}: BillingPanelProps) {
  const [stats, setStats] = useState(initialStats);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [byPlan, setByPlan] = useState(initialByPlan);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [stripeOnly, setStripeOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchBillingOverviewAction({
        query,
        plan: planFilter || undefined,
        stripeOnly,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setStats(result.stats);
      setAccounts(result.accounts);
      setByPlan(result.byPlan);
    });
  }, [planFilter, query, stripeOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredMrr = useMemo(
    () => accounts.reduce((sum, row) => sum + estimateBusinessMrr(row.subscriptionPlan, row.subscriptionStatus), 0),
    [accounts],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Биллинг"
        description="Подписки, Stripe customer/subscription и оценка MRR по аккаунтам"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/billing/plans"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              Тарифы и Stripe
            </Link>
            <button
              type="button"
              disabled={accounts.length === 0 || isPending}
              onClick={() => {
                const csv = buildCsvContent(
                  [
                    "business",
                    "owner_email",
                    "plan",
                    "status",
                    "mrr_usd",
                    "stripe_customer_id",
                    "stripe_subscription_id",
                    "created_at",
                  ],
                  accounts.map((account) => [
                    account.businessName,
                    account.ownerEmail ?? "",
                    account.subscriptionPlan,
                    account.subscriptionStatus,
                    account.estimatedMrrUsd,
                    account.stripeCustomerId ?? "",
                    account.stripeSubscriptionId ?? "",
                    account.createdAt,
                  ]),
                );
                downloadCsv(`orzux-billing-${Date.now()}.csv`, csv);
              }}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              Export CSV
            </button>
            <a
              href={getStripeDashboardHomeUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              Stripe Dashboard
              <ExternalLinkIcon className="size-4" />
            </a>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Оценка MRR"
          value={`$${filteredMrr.toFixed(0)}`}
          icon={CreditCardIcon}
          tone="info"
        />
        <StatCard
          title="Активных подписок"
          value={String(stats.activeSubscriptions)}
          icon={UsersIcon}
          tone="success"
        />
        <StatCard
          title="Со Stripe customer"
          value={String(stats.withStripe)}
          icon={CreditCardIcon}
        />
        <StatCard
          title="Всего аккаунтов"
          value={String(stats.totalAccounts)}
          icon={UsersIcon}
        />
      </div>

      <SectionCard title="По тарифам" description="Количество аккаунтов и оценка выручки">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {byPlan.map((entry) => (
            <div key={entry.plan} className="rounded-lg border bg-muted/20 px-3 py-3">
              <p className="text-sm font-medium">{entry.label}</p>
              <p className="mt-1 text-2xl font-semibold">{entry.count}</p>
              <p className="text-xs text-muted-foreground">
                ~${entry.revenueUsd.toFixed(0)}/мес
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Аккаунты" description="Stripe deep links и статус подписки">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию бизнеса"
              className="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm"
            />
          </label>
          <select
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">Все тарифы</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stripeOnly}
              onChange={(event) => setStripeOnly(event.target.checked)}
              className="size-4 accent-primary"
            />
            Только со Stripe
          </label>
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            title="Аккаунты не найдены"
            description="Попробуйте изменить фильтры или поиск."
            icon={CreditCardIcon}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">Бизнес</th>
                  <th className="px-3 py-2">Тариф</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">MRR</th>
                  <th className="px-3 py-2">Stripe</th>
                  <th className="px-3 py-2">Создан</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.businessId} className="border-b last:border-0">
                    <td className="px-3 py-3">
                      <Link
                        href={`/businesses/${account.businessId}`}
                        className="font-medium hover:text-primary"
                      >
                        {account.businessName}
                      </Link>
                      {account.ownerEmail ? (
                        <p className="text-xs text-muted-foreground">
                          {account.ownerEmail}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge label={planLabel(account.subscriptionPlan)} tone="info" />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        label={subscriptionStatusLabel(account.subscriptionStatus)}
                        tone={subscriptionStatusTone(account.subscriptionStatus)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      ${account.estimatedMrrUsd.toFixed(0)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {account.stripeCustomerId ? (
                          <a
                            href={getStripeCustomerDashboardUrl(account.stripeCustomerId)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          >
                            Customer
                            <ArrowUpRightIcon className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {account.stripeSubscriptionId ? (
                          <a
                            href={getStripeSubscriptionDashboardUrl(
                              account.stripeSubscriptionId,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          >
                            Subscription
                            <ArrowUpRightIcon className="size-3" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {formatAdminDateTime(account.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isPending ? (
          <p className="mt-3 text-xs text-muted-foreground">Обновление...</p>
        ) : null}
      </SectionCard>
    </div>
  );
}
