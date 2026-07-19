"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ContactPipelineBoard } from "@/components/contacts/ContactPipelineBoard";
import { ContactProfileDrawer } from "@/components/contacts/ContactProfileDrawer";
import { ContactRecordWorkspace } from "@/components/contacts/ContactRecordWorkspace";
import { DealsWorkspace } from "@/components/contacts/DealsWorkspace";
import { useContactsChromeRegistration } from "@/components/contacts/contacts-chrome-context";
import { UnifiedContactsPanel } from "@/components/contacts/UnifiedContactsPanel";
import { Button } from "@/components/ui/button";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { cn } from "@/lib/utils";
import type {
  ContactPipelinePageData,
  ContactSegment,
  CrmEntityTab,
  LeadSegment,
  LeadsPageData,
  UnifiedContactsPageData,
} from "@/types/contact.types";
import { LEAD_PIPELINE_STAGES } from "@/types/contact.types";
import type { CrmDealsPageData } from "@/types/crm-deal.types";
import type { MessagingChannel } from "@/types/database.types";
import { buildContactsHref } from "@/utils/contacts-url";

type ContactRecordHubProps = {
  activeTab: CrmEntityTab;
  listData: UnifiedContactsPageData | null;
  leadsData: LeadsPageData | null;
  dealsData: CrmDealsPageData | null;
  pipelineData: ContactPipelinePageData | null;
  leadsPipelineData: ContactPipelinePageData | null;
  visibleChannelIds: MessagingChannel[];
  voiceInboxEnabled?: boolean;
  smsInboxEnabled?: boolean;
};

function buildContactsHubHref(
  data: UnifiedContactsPageData,
  overrides: Parameters<typeof buildContactsHref>[0] = {},
) {
  return buildContactsHref({
    tab: "contacts",
    channel: data.activeChannelFilter,
    segment: data.activeSegment,
    view: data.activeView,
    contact: data.activeContactId,
    profile: data.showProfilePanel,
    q: data.searchQuery || null,
    page: data.page,
    ...overrides,
  });
}

function buildLeadsHubHref(
  data: LeadsPageData,
  overrides: Parameters<typeof buildContactsHref>[0] = {},
) {
  return buildContactsHref({
    tab: "leads",
    channel: data.activeChannelFilter,
    leadSegment: data.activeLeadSegment,
    view: data.activeView,
    contact: data.activeContactId,
    profile: data.showProfilePanel,
    q: data.searchQuery || null,
    page: data.page,
    ...overrides,
  });
}

export function ContactRecordHub({
  activeTab,
  listData,
  leadsData,
  dealsData,
  pipelineData,
  leadsPipelineData,
  visibleChannelIds,
  voiceInboxEnabled = false,
  smsInboxEnabled = false,
}: ContactRecordHubProps) {
  const router = useRouter();
  const currentListData =
    activeTab === "leads" ? leadsData : listData;
  const [searchValue, setSearchValue] = useState(
    currentListData?.searchQuery ?? dealsData?.searchQuery ?? "",
  );
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(
    currentListData?.showProfilePanel ?? false,
  );
  const showRecordOnMobile = Boolean(currentListData?.activeContactId);

  useEffect(() => {
    setProfileOpen(currentListData?.showProfilePanel ?? false);
  }, [currentListData?.showProfilePanel]);

  useEffect(() => {
    setSearchValue(currentListData?.searchQuery ?? dealsData?.searchQuery ?? "");
  }, [currentListData?.searchQuery, dealsData?.searchQuery]);

  // Refresh / hard reload always resets channel filter to All.
  useEffect(() => {
    if (!currentListData?.activeChannelFilter) {
      return;
    }

    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type !== "reload") {
      return;
    }

    const href =
      activeTab === "leads"
        ? buildLeadsHubHref(currentListData as LeadsPageData, {
            channel: null,
            page: 1,
          })
        : buildContactsHubHref(currentListData, {
            channel: null,
            page: 1,
          });
    router.replace(href);
  }, [activeTab, currentListData, router]);

  useEffect(() => {
    if (activeTab === "deals" || !currentListData) {
      return;
    }

    const trimmed = searchValue.trim();

    if (trimmed === currentListData.searchQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const href =
        activeTab === "leads"
          ? buildLeadsHubHref(currentListData as LeadsPageData, {
              q: trimmed || null,
              page: 1,
              contact: currentListData.activeContactId,
              profile: currentListData.showProfilePanel,
            })
          : buildContactsHubHref(currentListData, {
              q: trimmed || null,
              page: 1,
              contact: currentListData.activeContactId,
              profile: currentListData.showProfilePanel,
            });

      router.replace(href);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activeTab, currentListData, router, searchValue]);

  const handleViewChange = useCallback(
    (view: "list" | "pipeline") => {
      if (!currentListData) {
        return;
      }

      const href =
        activeTab === "leads"
          ? buildLeadsHubHref(currentListData as LeadsPageData, {
              view,
              page: 1,
              contact: currentListData.activeContactId,
              profile: currentListData.showProfilePanel,
            })
          : buildContactsHubHref(currentListData, {
              view,
              page: 1,
              contact: currentListData.activeContactId,
              profile: currentListData.showProfilePanel,
            });

      router.push(href);
    },
    [activeTab, currentListData, router],
  );

  const handleSegmentChange = useCallback(
    (segment: ContactSegment) => {
      if (!listData) {
        return;
      }

      router.push(
        buildContactsHubHref(listData, {
          segment,
          page: 1,
          contact: listData.activeContactId,
          profile: listData.showProfilePanel,
        }),
      );
    },
    [listData, router],
  );

  const handleLeadSegmentChange = useCallback(
    (leadSegment: LeadSegment) => {
      if (!leadsData) {
        return;
      }

      router.push(
        buildLeadsHubHref(leadsData, {
          leadSegment,
          page: 1,
          contact: leadsData.activeContactId,
          profile: leadsData.showProfilePanel,
        }),
      );
    },
    [leadsData, router],
  );

  const handleChannelChange = useCallback(
    (channel: MessagingChannel | null) => {
      if (!currentListData) {
        return;
      }

      const href =
        activeTab === "leads"
          ? buildLeadsHubHref(currentListData as LeadsPageData, {
              channel,
              page: 1,
              contact: currentListData.activeContactId,
              profile: currentListData.showProfilePanel,
            })
          : buildContactsHubHref(currentListData, {
              channel,
              page: 1,
              contact: currentListData.activeContactId,
              profile: currentListData.showProfilePanel,
            });

      router.push(href);
    },
    [activeTab, currentListData, router],
  );

  useContactsChromeRegistration(
    activeTab === "deals"
      ? null
      : currentListData
        ? {
            activeTab,
            searchQuery: searchValue,
            onSearchChange: setSearchValue,
            activeView: currentListData.activeView,
            onViewChange: handleViewChange,
            activeSegment:
              activeTab === "contacts" ? listData?.activeSegment ?? "all" : "all",
            onSegmentChange:
              activeTab === "contacts" ? handleSegmentChange : undefined,
            activeLeadSegment:
              activeTab === "leads"
                ? leadsData?.activeLeadSegment ?? "all_leads"
                : undefined,
            onLeadSegmentChange:
              activeTab === "leads" ? handleLeadSegmentChange : undefined,
            activeChannel: currentListData.activeChannelFilter,
            onChannelChange: handleChannelChange,
            visibleChannelIds,
            voiceInboxEnabled,
            smsInboxEnabled,
            crmListData: activeTab === "leads" ? leadsData : listData,
            crmDealsData: dealsData,
          }
        : null,
  );

  function clearContactSelection() {
    if (!currentListData) {
      return;
    }

    setMobileProfileOpen(false);
    setProfileOpen(false);

    const href =
      activeTab === "leads"
        ? buildLeadsHubHref(currentListData as LeadsPageData, {
            contact: null,
            profile: false,
          })
        : buildContactsHubHref(currentListData, {
            contact: null,
            profile: false,
          });

    router.push(href);
  }

  function toggleProfilePanel() {
    if (!currentListData?.activeContactId) {
      return;
    }

    const next = !profileOpen;
    setProfileOpen(next);

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setMobileProfileOpen(next);
      return;
    }

    const href =
      activeTab === "leads"
        ? buildLeadsHubHref(currentListData as LeadsPageData, {
            contact: currentListData.activeContactId,
            profile: next,
          })
        : buildContactsHubHref(currentListData, {
            contact: currentListData.activeContactId,
            profile: next,
          });

    router.replace(href);
  }

  if (activeTab === "deals" && dealsData) {
    return (
      <div className="flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
        <DealsWorkspace dealsData={dealsData} />
      </div>
    );
  }

  if (!currentListData) {
    return null;
  }

  return (
    <div className="flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">

        <div
          className={cn(
            "grid min-h-0 min-w-0 flex-1 overflow-hidden",
            "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]",
          )}
        >
        <aside
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden border-r",
            showRecordOnMobile && "hidden lg:flex",
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {currentListData.activeView === "pipeline" ? (
              activeTab === "leads" && leadsPipelineData ? (
                <ContactPipelineBoard
                  {...leadsPipelineData}
                  activeContactId={currentListData.activeContactId}
                  listData={leadsData ?? undefined}
                  stages={LEAD_PIPELINE_STAGES}
                  tab="leads"
                />
              ) : pipelineData ? (
                <ContactPipelineBoard
                  {...pipelineData}
                  activeContactId={currentListData.activeContactId}
                  listData={listData ?? undefined}
                  tab="contacts"
                />
              ) : null
            ) : (
              <UnifiedContactsPanel
                {...currentListData}
                variant={activeTab === "leads" ? "leads" : "contacts"}
                embedded
              />
            )}
          </div>

          {currentListData.activeView === "list" &&
          currentListData.total > currentListData.pageSize ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentListData.page <= 1}
                asChild={currentListData.page > 1}
              >
                {currentListData.page > 1 ? (
                  <Link
                    href={
                      activeTab === "leads"
                        ? buildLeadsHubHref(currentListData as LeadsPageData, {
                            page: currentListData.page - 1,
                            contact: currentListData.activeContactId,
                          })
                        : buildContactsHubHref(currentListData, {
                            page: currentListData.page - 1,
                            contact: currentListData.activeContactId,
                          })
                    }
                  >
                    {CONTACTS_MESSAGES.previousPage}
                  </Link>
                ) : (
                  <span>{CONTACTS_MESSAGES.previousPage}</span>
                )}
              </Button>
              <span className="text-caption text-muted-foreground">
                {CONTACTS_MESSAGES.pageIndicator(currentListData.page)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!currentListData.hasMore}
                asChild={currentListData.hasMore}
              >
                {currentListData.hasMore ? (
                  <Link
                    href={
                      activeTab === "leads"
                        ? buildLeadsHubHref(currentListData as LeadsPageData, {
                            page: currentListData.page + 1,
                            contact: currentListData.activeContactId,
                          })
                        : buildContactsHubHref(currentListData, {
                            page: currentListData.page + 1,
                            contact: currentListData.activeContactId,
                          })
                    }
                  >
                    {CONTACTS_MESSAGES.nextPage}
                  </Link>
                ) : (
                  <span>{CONTACTS_MESSAGES.nextPage}</span>
                )}
              </Button>
            </div>
          ) : null}
        </aside>

        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden",
            showRecordOnMobile ? "flex" : "hidden lg:flex",
          )}
        >
          <ContactRecordWorkspace
            contactId={currentListData.activeContactId}
            profileOpen={profileOpen || mobileProfileOpen}
            onToggleProfile={toggleProfilePanel}
            onContactDeleted={clearContactSelection}
            onBack={showRecordOnMobile ? clearContactSelection : undefined}
          />
        </main>
      </div>
      </div>

      <ContactProfileDrawer
        contactId={currentListData.activeContactId}
        open={mobileProfileOpen}
        onOpenChange={(open) => {
          setMobileProfileOpen(open);

          if (!open) {
            setProfileOpen(false);
          }
        }}
        onContactDeleted={clearContactSelection}
      />
    </div>
  );
}
