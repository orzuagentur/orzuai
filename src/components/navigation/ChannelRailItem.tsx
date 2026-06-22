"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { getChannelRailRowClassName } from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";

type ChannelRailItemProps = {
  href: string;
  isActive: boolean;
  label: string;
  ariaLabel: string;
  iconShell: ReactNode;
  badge?: number | null;
  prefetch?: boolean;
};

export function ChannelRailItem({
  href,
  isActive,
  label,
  ariaLabel,
  iconShell,
  badge,
  prefetch = true,
}: ChannelRailItemProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      title={label}
      aria-label={ariaLabel}
      aria-current={isActive ? "page" : undefined}
      className={getChannelRailRowClassName(isActive)}
    >
      <span className="relative shrink-0">
        {iconShell}
        {badge && badge > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-none text-primary-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "line-clamp-2 w-full text-[10px] leading-tight xl:text-xs",
          isActive
            ? "font-semibold text-foreground"
            : "font-medium text-muted-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
