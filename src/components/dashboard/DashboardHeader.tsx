"use client";

import { usePathname } from "next/navigation";

import { InboxToolbar } from "@/components/chats/inbox/InboxToolbar";
import { useOptionalInboxChrome } from "@/components/chats/inbox/use-optional-inbox-chrome";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";

function isInboxPath(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.chats ||
    pathname.startsWith(`${DASHBOARD_ROUTES.chats}/`)
  );
}

export function DashboardHeader() {
  const pathname = usePathname();
  const inboxChrome = useOptionalInboxChrome();
  const showInboxChrome = isInboxPath(pathname) && inboxChrome !== null;

  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-2 border-b px-3 sm:px-4",
        showInboxChrome ? "h-14 min-h-14" : "h-14",
      )}
    >
      <SidebarTrigger className="-ml-1 shrink-0" />

      {showInboxChrome ? (
        <>
          <div className="min-w-0 max-w-[5.5rem] shrink-0 sm:max-w-none">
            <p className="truncate text-sm font-semibold leading-tight">
              {CHAT_MESSAGES.pageTitle}
            </p>
            <p className="truncate text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
              {CHAT_MESSAGES.inboxSubtitle}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <InboxToolbar {...inboxChrome} className="justify-end" />
          </div>
        </>
      ) : (
        <div className="flex-1" />
      )}

      <ThemeToggle />
    </header>
  );
}
