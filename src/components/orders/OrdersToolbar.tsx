"use client";

import { useRef, useState } from "react";
import { FilterIcon, PlusIcon, SearchIcon, Settings2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrdersChromeConfig } from "@/components/orders/orders-chrome-context";
import {
  getOrderStatusLabel,
  ORDERS_MESSAGES,
} from "@/features/orders/constants";
import { cn } from "@/lib/utils";
import { CRM_ORDER_STATUSES } from "@/types/crm-order.types";

type OrdersToolbarProps = OrdersChromeConfig & {
  className?: string;
};

export function OrdersToolbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  activeStatus,
  onStatusChange,
  onAddOrder,
  onOpenFormSettings,
  className,
}: OrdersToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  function openFilter() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setFilterOpen(true);
  }

  function scheduleCloseFilter() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setFilterOpen(false);
      closeTimerRef.current = null;
    }, 120);
  }

  const hasActiveFilter = activeStatus !== "all";

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2", className)}>
      <form
        className="relative min-w-0 flex-1 sm:max-w-[9rem] md:max-w-xs lg:max-w-sm"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
      >
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={ORDERS_MESSAGES.searchPlaceholder}
          className="h-9 pl-8"
        />
      </form>

      <div
        className="relative shrink-0"
        onMouseEnter={openFilter}
        onMouseLeave={scheduleCloseFilter}
      >
        <Button
          type="button"
          size="icon"
          variant={hasActiveFilter ? "default" : "outline"}
          className="size-9"
          aria-label={ORDERS_MESSAGES.filtersLabel}
          aria-expanded={filterOpen}
        >
          <FilterIcon className="size-4" />
        </Button>

        {filterOpen ? (
          <div
            className="absolute top-full right-0 z-50 mt-1.5 w-56 rounded-xl border bg-popover p-3 text-popover-foreground shadow-md"
            onMouseEnter={openFilter}
            onMouseLeave={scheduleCloseFilter}
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {ORDERS_MESSAGES.filtersLabel}
            </p>
            <div className="grid gap-1.5">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  activeStatus === "all" && "bg-muted font-medium",
                )}
                onClick={() => onStatusChange("all")}
              >
                {ORDERS_MESSAGES.filterAll}
              </button>
              {CRM_ORDER_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    activeStatus === status && "bg-muted font-medium",
                  )}
                  onClick={() => onStatusChange(status)}
                >
                  {getOrderStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9 shrink-0"
        aria-label={ORDERS_MESSAGES.formSettingsLabel}
        onClick={onOpenFormSettings}
      >
        <Settings2Icon className="size-4" />
      </Button>

      <Button type="button" size="sm" className="shrink-0" onClick={onAddOrder}>
        <PlusIcon className="mr-1.5 size-4" />
        <span className="hidden sm:inline">{ORDERS_MESSAGES.addOrder}</span>
      </Button>
    </div>
  );
}
