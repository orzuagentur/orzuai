"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenIcon, ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES, DOCS_ROUTES } from "@/constants/routes";
import { SETTINGS_MESSAGES } from "@/features/settings/constants";
import { getNavSegmentActiveClassName } from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  {
    id: "push",
    href: DASHBOARD_ROUTES.settingsPush,
    label: SETTINGS_MESSAGES.tabPush,
  },
  {
    id: "quick-replies",
    href: DASHBOARD_ROUTES.settingsQuickReplies,
    label: SETTINGS_MESSAGES.tabQuickReplies,
  },
  {
    id: "language",
    href: DASHBOARD_ROUTES.settingsLanguage,
    label: SETTINGS_MESSAGES.tabLanguage,
  },
  {
    id: "profile",
    href: DASHBOARD_ROUTES.profile,
    label: SETTINGS_MESSAGES.tabProfile,
  },
  {
    id: "account",
    href: DASHBOARD_ROUTES.account,
    label: SETTINGS_MESSAGES.tabAccount,
  },
] as const;

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex dashboard-main-frame min-h-0 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b bg-background px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{SETTINGS_MESSAGES.pageTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {SETTINGS_MESSAGES.pageDescription}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 self-start"
              asChild
            >
              <Link
                href={DOCS_ROUTES.root}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BookOpenIcon className="size-4" aria-hidden="true" />
                {SETTINGS_MESSAGES.openDocumentation}
                <ExternalLinkIcon
                  className="size-3.5 opacity-60"
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto">
              {SETTINGS_TABS.map((tab) => {
                const isActive =
                  pathname === tab.href ||
                  (tab.id === "profile" &&
                    pathname.startsWith(`${DASHBOARD_ROUTES.profile}`)) ||
                  (tab.id === "account" &&
                    pathname.startsWith(`${DASHBOARD_ROUTES.account}`));

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
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
