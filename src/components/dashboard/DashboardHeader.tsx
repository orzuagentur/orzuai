"use client";

import { usePathname } from "next/navigation";

import { AnalyticsTabBar } from "@/components/analytics/AnalyticsTabBar";
import { useOptionalAnalyticsChrome } from "@/components/analytics/analytics-chrome-context";
import { InboxToolbar } from "@/components/chats/inbox/InboxToolbar";
import { AiAssistantToolbar } from "@/components/ai-assistant/AiAssistantToolbar";
import {
  AutomationsHeaderActions,
  AutomationsTabBar,
} from "@/components/automations/AutomationsTabBar";
import { useOptionalAutomationsChrome } from "@/components/automations/automations-chrome-context";
import { ContactsToolbar } from "@/components/contacts/ContactsToolbar";
import { CrmEntityTabs } from "@/components/contacts/CrmEntityTabs";
import { useOptionalAiAssistantChrome } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { useOptionalContactsChrome } from "@/components/contacts/contacts-chrome-context";
import { useOptionalInboxChrome } from "@/components/chats/inbox/use-optional-inbox-chrome";
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
  return pathname === DASHBOARD_ROUTES.aiAgentsSection;
}

function isAnalyticsPath(pathname: string): boolean {
  return pathname === DASHBOARD_ROUTES.analytics;
}

function isAutomationsPath(pathname: string): boolean {
  return pathname === DASHBOARD_ROUTES.automations;
}

export function DashboardHeader() {
  const pathname = usePathname();
  const pageMeta = getDashboardPageHeaderMeta(pathname);
  const inboxChrome = useOptionalInboxChrome();
  const contactsChrome = useOptionalContactsChrome();
  const aiAssistantChrome = useOptionalAiAssistantChrome();
  const analyticsChrome = useOptionalAnalyticsChrome();
  const automationsChrome = useOptionalAutomationsChrome();
  const showInboxToolbar = isInboxPath(pathname) && inboxChrome !== null;
  const showContactsToolbar =
    isContactsPath(pathname) && contactsChrome !== null;
  const showAiAssistantToolbar =
    isAiAssistantPath(pathname) && aiAssistantChrome !== null;
  const showAnalyticsTabs =
    isAnalyticsPath(pathname) && analyticsChrome !== null;
  const showAutomationsTabs =
    isAutomationsPath(pathname) && automationsChrome !== null;
  const compactHeading =
    showInboxToolbar ||
    showContactsToolbar ||
    showAiAssistantToolbar ||
    showAnalyticsTabs ||
    showAutomationsTabs;

  return (
    <header className="flex h-14 min-h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4">
      <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />

      {pageMeta ? (
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
          ) : showAnalyticsTabs && analyticsChrome ? (
            <div className="flex min-w-0 flex-1 justify-end">
              <AnalyticsTabBar
                activeTab={analyticsChrome.activeTab}
                onTabChange={analyticsChrome.onTabChange}
                variant="header"
              />
            </div>
          ) : showAutomationsTabs && automationsChrome ? (
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <AutomationsTabBar
                activeTab={automationsChrome.activeTab}
                onTabChange={automationsChrome.onTabChange}
                variant="header"
              />
              <AutomationsHeaderActions
                activeTab={automationsChrome.activeTab}
                onEnableRecommended={automationsChrome.onEnableRecommended}
                isEnablingRecommended={automationsChrome.isEnablingRecommended}
              />
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
