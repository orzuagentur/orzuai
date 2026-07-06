"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BILLING_MESSAGES } from "@/features/billing/constants";
import { getNavSegmentActiveClassName } from "@/features/navigation/channel-rail-ui";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const BILLING_TABS = [
  { id: "overview", href: DASHBOARD_ROUTES.subscription, label: BILLING_MESSAGES.tabOverview },
  {
    id: "whatsapp",
    href: DASHBOARD_ROUTES.subscriptionWhatsApp,
    label: BILLING_MESSAGES.tabWhatsApp,
  },
  {
    id: "twilio",
    href: DASHBOARD_ROUTES.subscriptionTwilio,
    label: BILLING_MESSAGES.tabTwilio,
  },
] as const;

export function BillingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b bg-background px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{BILLING_MESSAGES.pageTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {BILLING_MESSAGES.pageDescription}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto">
            {BILLING_TABS.map((tab) => {
              const isActive =
                tab.href === DASHBOARD_ROUTES.subscription
                  ? pathname === tab.href
                  : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    getNavSegmentActiveClassName(isActive),
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
