"use client";

import type { ReactNode } from "react";
import { PenLineIcon, SparklesIcon } from "lucide-react";

import { ChannelBrandIcon, isChannelBrandId } from "@/components/icons/channel-brand-icons";
import { getOrderSourceLabel } from "@/features/orders/constants";
import { cn } from "@/lib/utils";
import type { CrmOrderSource } from "@/types/crm-order.types";

type OrderSourceIconProps = {
  source: CrmOrderSource;
  className?: string;
  showLabel?: boolean;
};

export function OrderSourceIcon({
  source,
  className,
  showLabel = false,
}: OrderSourceIconProps) {
  const label = getOrderSourceLabel(source);

  let icon: ReactNode;
  if (source === "manual") {
    icon = <PenLineIcon className={cn("size-4 text-muted-foreground", className)} />;
  } else if (source === "ai") {
    icon = <SparklesIcon className={cn("size-4 text-muted-foreground", className)} />;
  } else if (isChannelBrandId(source)) {
    icon = <ChannelBrandIcon channel={source} className={cn("size-4", className)} />;
  } else {
    icon = <PenLineIcon className={cn("size-4 text-muted-foreground", className)} />;
  }

  if (!showLabel) {
    return (
      <span className="inline-flex" title={label} aria-label={label}>
        {icon}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5" title={label}>
      {icon}
      <span className="text-sm">{label}</span>
    </span>
  );
}
