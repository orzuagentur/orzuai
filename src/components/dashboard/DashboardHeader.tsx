"use client";

import { usePathname } from "next/navigation";

import { InboxToolbar } from "@/components/chats/inbox/InboxToolbar";
import { AiAssistantToolbar } from "@/components/ai-assistant/AiAssistantToolbar";
import { CalendarToolbar } from "@/components/orzux-calendar/CalendarToolbar";
import { useOptionalCalendarChrome } from "@/components/orzux-calendar/calendar-chrome-context";
import { ContactsToolbar } from "@/components/contacts/ContactsToolbar";
import { CrmEntityTabs } from "@/components/contacts/CrmEntityTabs";
import { useOptionalAiAssistantChrome } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { useOptionalContactsChrome } from "@/components/contacts/contacts-chrome-context";
import { useOptionalInboxChrome } from "@/components/chats/inbox/use-optional-inbox-chrome";
import { OrdersToolbar } from "@/components/orders/OrdersToolbar";
import { useOptionalOrdersChrome } from "@/components/orders/orders-chrome-context";
import { DashboardPageHeading } from "@/components/dashboard/DashboardPageHeading";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getDashboardPageHeaderMeta } from "@/features/dashboard/page-header-meta";

function isInboxPath(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.chats ||
    pathname.startsWith(`${DASHBOARD_ROUTES.chats}/`)
  );
}

function isContactsPath(pathname: string): boolean {
  return pathname === DASHBOARD_ROUTES.contacts;
}

function isAiAssistantPath(pathname: string): boolean {
  return pathname === DASHBOARD_ROUTES.aiAssistant;
}

function isCalendarPath(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.calendar ||
    pathname.startsWith(`${DASHBOARD_ROUTES.calendar}/`)
  );
}

function isOrdersPath(pathname: string): boolean {
  return (
    pathname === DASHBOARD_ROUTES.orders ||
    pathname.startsWith(`${DASHBOARD_ROUTES.orders}/`)
  );
}

export function DashboardHeader() {
  const pathname = usePathname();
  const pageMeta = getDashboardPageHeaderMeta(pathname);
  const inboxChrome = useOptionalInboxChrome();
  const contactsChrome = useOptionalContactsChrome();
  const aiAssistantChrome = useOptionalAiAssistantChrome();
  const calendarChrome = useOptionalCalendarChrome();
  const ordersChrome = useOptionalOrdersChrome();
  const showInboxToolbar = isInboxPath(pathname) && inboxChrome !== null;
  const showContactsToolbar =
    isContactsPath(pathname) && contactsChrome !== null;
  const showAiAssistantToolbar =
    isAiAssistantPath(pathname) && aiAssistantChrome !== null;
  const showCalendarToolbar =
    isCalendarPath(pathname) && calendarChrome !== null;
  const showOrdersToolbar = isOrdersPath(pathname) && ordersChrome !== null;
  const compactHeading =
    showInboxToolbar ||
    showContactsToolbar ||
    showAiAssistantToolbar ||
    showCalendarToolbar ||
    showOrdersToolbar;

  return (
    <header className="flex h-14 min-h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4">
      <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />

      {showCalendarToolbar && calendarChrome ? (
        <CalendarToolbar chrome={calendarChrome} />
      ) : pageMeta ? (
        <>
          <DashboardPageHeading title={pageMeta.title} compact={compactHeading} />

          {showInboxToolbar && inboxChrome ? (
            <div className="min-w-0 flex-1">
              <InboxToolbar {...inboxChrome} className="justify-end" />
            </div>
          ) : showContactsToolbar && contactsChrome ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <CrmEntityTabs
                activeTab={contactsChrome.activeTab}
                listData={contactsChrome.crmListData}
                dealsData={contactsChrome.crmDealsData}
                variant="header"
                className="ml-3 shrink-0 sm:ml-6 md:ml-10"
              />
              <ContactsToolbar
                {...contactsChrome}
                className="min-w-0 flex-1 justify-end"
              />
            </div>
          ) : showAiAssistantToolbar && aiAssistantChrome ? (
            <div className="min-w-0 flex-1">
              <AiAssistantToolbar
                {...aiAssistantChrome}
                className="justify-end"
              />
            </div>
          ) : showOrdersToolbar && ordersChrome ? (
            <div className="min-w-0 flex-1">
              <OrdersToolbar {...ordersChrome} className="justify-end" />
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
        </>
      ) : (
        <div className="flex-1" />
      )}
    </header>
  );
}
