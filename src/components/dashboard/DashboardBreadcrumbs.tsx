"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { resolveDashboardBreadcrumbs } from "@/utils/dashboard-breadcrumbs";

type DashboardBreadcrumbsProps = {
  className?: string;
};

export function DashboardBreadcrumbs({ className }: DashboardBreadcrumbsProps) {
  const pathname = usePathname();
  const crumbs = resolveDashboardBreadcrumbs(pathname);

  if (crumbs.length === 1) {
    const crumb = crumbs[0];

    return (
      <span className={className}>
        <span className="truncate text-sm font-medium">{crumb?.label ?? "OrzuAI"}</span>
      </span>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="truncate font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="truncate font-medium"
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
