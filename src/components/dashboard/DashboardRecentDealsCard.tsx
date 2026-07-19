"use client";

import Link from "next/link";
import { HandshakeIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { formatDealMoney } from "@/lib/deal-currency";
import { cn } from "@/lib/utils";
import type { CrmDealListItem } from "@/types/crm-deal.types";

type DashboardRecentDealsCardProps = {
  deals: CrmDealListItem[];
};

function statusLabel(status: CrmDealListItem["status"]): string {
  if (status === "won") return CONTACTS_MESSAGES.dealStatusWon;
  if (status === "lost") return CONTACTS_MESSAGES.dealStatusLost;
  return CONTACTS_MESSAGES.dealStatusOpen;
}

function statusClassName(status: CrmDealListItem["status"]): string {
  if (status === "won") return "text-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-100";
  if (status === "lost") return "text-rose-700 bg-rose-50 dark:bg-rose-950/40";
  return "text-sky-700 bg-sky-50 dark:bg-sky-950/40";
}

export function DashboardRecentDealsCard({
  deals,
}: DashboardRecentDealsCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Recent deals</CardTitle>
            <CardDescription>Last 3 CRM deals</CardDescription>
          </div>
          <Link
            href={`${DASHBOARD_ROUTES.contacts}?tab=deals`}
            className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/15"
            title="Open deals"
          >
            <HandshakeIcon className="size-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {deals.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No deals yet.
          </p>
        ) : (
          deals.map((deal) => (
            <Link
              key={deal.id}
              href={`${DASHBOARD_ROUTES.contacts}?tab=deals&deal=${deal.id}`}
              className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{deal.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {deal.contactName}
                  {deal.value != null
                    ? ` · ${formatDealMoney(deal.value, deal.currency)}`
                    : null}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium",
                  statusClassName(deal.status),
                )}
              >
                {statusLabel(deal.status)}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
