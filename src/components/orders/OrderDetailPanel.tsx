"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderSourceIcon } from "@/components/orders/OrderSourceIcon";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { updateCrmOrderStatusAction } from "@/features/orders/actions/update-order-status";
import {
  formatOrderDateTime,
  getOrderStatusLabel,
  ORDERS_MESSAGES,
} from "@/features/orders/constants";
import { cn } from "@/lib/utils";
import type { CrmOrderListItem, CrmOrderStatus } from "@/types/crm-order.types";
import { CRM_ORDER_STATUSES } from "@/types/crm-order.types";

type OrderDetailPanelProps = {
  order: CrmOrderListItem;
  onClose: () => void;
};

function statusBadgeClass(status: CrmOrderStatus): string {
  switch (status) {
    case "new":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case "done":
      return "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-200";
    case "cancelled":
      return "border-muted bg-muted text-muted-foreground";
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1 border-b py-3 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function OrderDetailPanel({ order, onClose }: OrderDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(next: string) {
    startTransition(async () => {
      const result = await updateCrmOrderStatusAction({
        orderId: order.id,
        status: next as CrmOrderStatus,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(ORDERS_MESSAGES.updateSuccess);
      router.refresh();
    });
  }

  const chatHref = order.conversationId
    ? `${DASHBOARD_ROUTES.chats}?conversation=${order.conversationId}`
    : null;
  const contactHref = order.contactId
    ? `${DASHBOARD_ROUTES.contacts}?contact=${order.contactId}`
    : null;
  const footerHref = chatHref ?? contactHref;
  const footerLabel = chatHref
    ? ORDERS_MESSAGES.openChat
    : ORDERS_MESSAGES.openContact;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-background">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {ORDERS_MESSAGES.detailTitle}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {order.customerDisplayName}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label={ORDERS_MESSAGES.closeDetail}
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <DetailRow
          label={ORDERS_MESSAGES.detailCustomer}
          value={order.customerDisplayName}
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailContacts}
          value={
            <div className="space-y-1">
              <p>{order.contactPhone || ORDERS_MESSAGES.notSpecified}</p>
              <p className="text-muted-foreground">
                {order.contactEmail || ORDERS_MESSAGES.notSpecified}
              </p>
            </div>
          }
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailWanted}
          value={order.title}
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailService}
          value={order.serviceType || ORDERS_MESSAGES.notSpecified}
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailDescription}
          value={
            <p className="whitespace-pre-wrap">
              {order.description || ORDERS_MESSAGES.notSpecified}
            </p>
          }
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailAmount}
          value={
            order.amount !== null
              ? `${order.amount} ${order.currency}`
              : ORDERS_MESSAGES.notSpecified
          }
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailSource}
          value={<OrderSourceIcon source={order.source} showLabel />}
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailCreated}
          value={formatOrderDateTime(order.createdAt)}
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailUpdated}
          value={formatOrderDateTime(order.updatedAt)}
        />
        <DetailRow
          label={ORDERS_MESSAGES.detailStatus}
          value={
            <div className="flex flex-col gap-2">
              <Badge
                variant="outline"
                className={cn("w-fit font-normal", statusBadgeClass(order.status))}
              >
                {getOrderStatusLabel(order.status)}
              </Badge>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={order.status}
                disabled={isPending}
                onChange={(event) => handleStatusChange(event.target.value)}
              >
                {CRM_ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getOrderStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </div>

      {footerHref ? (
        <div className="shrink-0 border-t p-4">
          <Button asChild className="w-full" variant="outline">
            <Link href={footerHref}>{footerLabel}</Link>
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
