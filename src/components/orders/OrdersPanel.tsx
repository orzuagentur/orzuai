"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CreateOrderDialog } from "@/components/orders/CreateOrderDialog";
import { OrderDetailPanel } from "@/components/orders/OrderDetailPanel";
import { OrderFormSettingsDialog } from "@/components/orders/OrderFormSettingsDialog";
import { OrderSourceIcon } from "@/components/orders/OrderSourceIcon";
import { useOrdersChromeRegistration } from "@/components/orders/orders-chrome-context";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  formatOrderDateTime,
  getOrderStatusLabel,
  ORDERS_MESSAGES,
} from "@/features/orders/constants";
import type { OrderFormField } from "@/features/orders/order-form-fields";
import { cn } from "@/lib/utils";
import type { CrmOrderStatus, CrmOrdersPageData } from "@/types/crm-order.types";

type OrdersPanelProps = {
  data: CrmOrdersPageData;
  formFields: OrderFormField[];
};

function statusBadgeClass(status: CrmOrderStatus): string {
  switch (status) {
    case "new":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case "done":
      return "border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
    case "cancelled":
      return "border-muted bg-muted text-muted-foreground";
  }
}

function buildOrdersHref(input: {
  status?: string;
  q?: string;
  order?: string | null;
}) {
  const params = new URLSearchParams();

  if (input.status && input.status !== "all") {
    params.set("status", input.status);
  }

  if (input.q?.trim()) {
    params.set("q", input.q.trim());
  }

  if (input.order) {
    params.set("order", input.order);
  }

  const suffix = params.toString();
  return suffix ? `${DASHBOARD_ROUTES.orders}?${suffix}` : DASHBOARD_ROUTES.orders;
}

export function OrdersPanel({ data, formFields: initialFormFields }: OrdersPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState(data.searchQuery);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formFields, setFormFields] = useState(initialFormFields);

  const selectedOrder =
    data.orders.find((order) => order.id === data.activeOrderId) ?? null;

  useEffect(() => {
    setQuery(data.searchQuery);
  }, [data.searchQuery]);

  useEffect(() => {
    setFormFields(initialFormFields);
  }, [initialFormFields]);

  const pushFilters = useCallback(
    (next: { status?: string; q?: string; order?: string | null }) => {
      router.push(
        buildOrdersHref({
          status: next.status ?? data.activeStatus,
          q: next.q ?? query,
          order: next.order === undefined ? data.activeOrderId : next.order,
        }),
      );
    },
    [data.activeOrderId, data.activeStatus, query, router],
  );

  const handleSearchSubmit = useCallback(() => {
    pushFilters({ q: query, order: null });
  }, [pushFilters, query]);

  const handleStatusChange = useCallback(
    (status: CrmOrderStatus | "all") => {
      pushFilters({ status, order: null });
    },
    [pushFilters],
  );

  const handleAddOrder = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleOpenFormSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed === data.searchQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      pushFilters({ q: trimmed, order: null });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [data.searchQuery, pushFilters, query]);

  useOrdersChromeRegistration({
    searchQuery: query,
    onSearchChange: setQuery,
    onSearchSubmit: handleSearchSubmit,
    activeStatus: data.activeStatus,
    onStatusChange: handleStatusChange,
    onAddOrder: handleAddOrder,
    onOpenFormSettings: handleOpenFormSettings,
  });

  return (
    <>
      <div className="flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
        <div
          className={cn(
            "grid min-h-0 min-w-0 flex-1 overflow-hidden",
            selectedOrder
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]"
              : "grid-cols-1",
          )}
        >
          <div
            className={cn(
              "min-h-0 min-w-0 overflow-auto",
              selectedOrder && "hidden lg:block",
            )}
          >
            {data.orders.length === 0 ? (
              <EmptyState
                title={ORDERS_MESSAGES.emptyTitle}
                description={ORDERS_MESSAGES.emptyDescription}
                className="h-full border-0"
                actionLabel={ORDERS_MESSAGES.addOrder}
                onAction={handleAddOrder}
              />
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 border-b bg-background">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">
                      {ORDERS_MESSAGES.colCustomer}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ORDERS_MESSAGES.colOrder}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ORDERS_MESSAGES.colService}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ORDERS_MESSAGES.colStatus}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ORDERS_MESSAGES.colDate}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {ORDERS_MESSAGES.colSource}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => {
                    const isActive = order.id === data.activeOrderId;
                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          "cursor-pointer border-b transition-colors hover:bg-muted/50",
                          isActive && "bg-muted/70",
                        )}
                        onClick={() =>
                          pushFilters({
                            order: order.id,
                          })
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {order.customerDisplayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.contactPhone || ORDERS_MESSAGES.notSpecified}
                          </div>
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-3">
                          {order.title}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.serviceType || ORDERS_MESSAGES.notSpecified}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              statusBadgeClass(order.status),
                            )}
                          >
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatOrderDateTime(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <OrderSourceIcon source={order.source} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {selectedOrder ? (
            <div className="min-h-0 min-w-0">
              <OrderDetailPanel
                order={selectedOrder}
                onClose={() => pushFilters({ order: null })}
              />
            </div>
          ) : null}
        </div>
      </div>

      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        formFields={formFields}
        onCreated={(orderId) => {
          router.push(buildOrdersHref({ order: orderId }));
          router.refresh();
        }}
      />

      <OrderFormSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialFields={formFields}
        onSaved={(fields) => {
          setFormFields(fields);
          router.refresh();
        }}
      />
    </>
  );
}
