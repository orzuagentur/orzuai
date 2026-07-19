"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { DASHBOARD_NAV_ITEMS } from "@/features/dashboard/constants";
import { useDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";
import { cn } from "@/lib/utils";

const MOBILE_TAB_IDS = [
  "overview",
  "chats",
  "voice",
  "contacts",
  "calendar",
  "team",
] as const;

function isTabActive(pathname: string, href: string, id: string): boolean {
  if (id === "overview") {
    return pathname === DASHBOARD_ROUTES.overview;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { counts } = useDashboardNavBadges();

  const tabs = DASHBOARD_NAV_ITEMS.filter((item) =>
    (MOBILE_TAB_IDS as readonly string[]).includes(item.id),
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto grid h-14 max-w-lg grid-cols-6 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(pathname, tab.href, tab.id);
          const badge =
            tab.id === "chats"
              ? counts.inboxUnread
              : tab.id === "contacts"
                ? counts.crmUnread
                : tab.id === "calendar"
                  ? counts.calendarAiUnread + counts.overdueTasks
                  : 0;

          return (
            <li key={tab.id} className="min-w-0">
              <Link
                href={tab.href}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex size-8 items-center justify-center rounded-lg",
                    active && "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {badge > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
