"use client";

import Link from "next/link";

import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { cn } from "@/lib/utils";
import type { CrmEntityTab } from "@/types/contact.types";
import type { CrmDealsPageData } from "@/types/crm-deal.types";
import type { LeadsPageData, UnifiedContactsPageData } from "@/types/contact.types";
import { buildContactsHref } from "@/utils/contacts-url";

type CrmEntityTabsProps = {
  activeTab: CrmEntityTab;
  listData?: UnifiedContactsPageData | LeadsPageData | null;
  dealsData?: CrmDealsPageData | null;
  className?: string;
};

function buildTabHref(
  tab: CrmEntityTab,
  listData?: UnifiedContactsPageData | LeadsPageData | null,
  dealsData?: CrmDealsPageData | null,
) {
  if (tab === "deals") {
    return buildContactsHref({
      tab: "deals",
      q: dealsData?.searchQuery || null,
      view: dealsData?.activeView === "list" ? "list" : "kanban",
      deal: dealsData?.activeDealId,
      contact: dealsData?.activeContactId,
      profile: dealsData?.showProfilePanel,
      stage: dealsData?.activeStageFilter,
      dealStatus: dealsData?.activeStatusFilter,
      page: dealsData?.page,
    });
  }

  if (tab === "leads") {
    const leadsData =
      listData && "activeLeadSegment" in listData ? listData : null;

    return buildContactsHref({
      tab: "leads",
      channel: leadsData?.activeChannelFilter ?? listData?.activeChannelFilter,
      leadSegment: leadsData?.activeLeadSegment,
      view: leadsData?.activeView ?? listData?.activeView,
      contact: leadsData?.activeContactId ?? listData?.activeContactId,
      profile: leadsData?.showProfilePanel ?? listData?.showProfilePanel,
      q: leadsData?.searchQuery ?? listData?.searchQuery ?? null,
      page: leadsData?.page ?? listData?.page,
    });
  }

  const contactsData =
    listData && !("activeLeadSegment" in listData) ? listData : null;

  return buildContactsHref({
    tab: "contacts",
    channel: contactsData?.activeChannelFilter ?? listData?.activeChannelFilter,
    segment: contactsData?.activeSegment ?? listData?.activeSegment,
    view: contactsData?.activeView ?? listData?.activeView,
    contact: contactsData?.activeContactId ?? listData?.activeContactId,
    profile: contactsData?.showProfilePanel ?? listData?.showProfilePanel,
    q: contactsData?.searchQuery ?? listData?.searchQuery ?? null,
    page: contactsData?.page ?? listData?.page,
  });
}

const TABS: Array<{ id: CrmEntityTab; label: string }> = [
  { id: "contacts", label: CONTACTS_MESSAGES.tabContacts },
  { id: "leads", label: CONTACTS_MESSAGES.tabLeads },
  { id: "deals", label: CONTACTS_MESSAGES.tabDeals },
];

export function CrmEntityTabs({
  activeTab,
  listData = null,
  dealsData = null,
  className,
}: CrmEntityTabsProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 border-b px-4 py-2",
        className,
      )}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={buildTabHref(tab.id, listData, dealsData)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
