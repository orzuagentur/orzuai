"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ContactPipelineBoard } from "@/components/contacts/ContactPipelineBoard";
import { ContactRecordPanel } from "@/components/contacts/ContactRecordPanel";
import { ContactsChannelTabs } from "@/components/contacts/ContactsChannelTabs";
import { useContactsChromeRegistration } from "@/components/contacts/contacts-chrome-context";
import { UnifiedContactsPanel } from "@/components/contacts/UnifiedContactsPanel";
import { Button } from "@/components/ui/button";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { cn } from "@/lib/utils";
import type {
  ContactPipelinePageData,
  ContactSegment,
  UnifiedContactsPageData,
} from "@/types/contact.types";
import type { MessagingChannel } from "@/types/database.types";
import { buildContactsHref } from "@/utils/contacts-url";

type ContactRecordHubProps = {
  listData: UnifiedContactsPageData;
  pipelineData: ContactPipelinePageData | null;
  visibleChannelIds: MessagingChannel[];
};

function buildHubHref(
  data: UnifiedContactsPageData,
  overrides: Parameters<typeof buildContactsHref>[0] = {},
) {
  return buildContactsHref({
    channel: data.activeChannelFilter,
    segment: data.activeSegment,
    view: data.activeView,
    contact: data.activeContactId,
    q: data.searchQuery || null,
    page: data.page,
    ...overrides,
  });
}

export function ContactRecordHub({
  listData,
  pipelineData,
  visibleChannelIds,
}: ContactRecordHubProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(listData.searchQuery);
  const showRecordOnMobile = Boolean(listData.activeContactId);

  useEffect(() => {
    setSearchValue(listData.searchQuery);
  }, [listData.searchQuery]);

  useEffect(() => {
    const trimmed = searchValue.trim();

    if (trimmed === listData.searchQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(
        buildHubHref(listData, {
          q: trimmed || null,
          page: 1,
          contact: listData.activeContactId,
        }),
      );
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [listData, router, searchValue]);

  const handleViewChange = useCallback(
    (view: "list" | "pipeline") => {
      router.push(
        buildHubHref(listData, {
          view,
          page: 1,
          contact: listData.activeContactId,
        }),
      );
    },
    [listData, router],
  );

  const handleSegmentChange = useCallback(
    (segment: ContactSegment) => {
      router.push(
        buildHubHref(listData, {
          segment,
          page: 1,
          contact: listData.activeContactId,
        }),
      );
    },
    [listData, router],
  );

  useContactsChromeRegistration({
    searchQuery: searchValue,
    onSearchChange: setSearchValue,
    activeView: listData.activeView,
    onViewChange: handleViewChange,
    activeSegment: listData.activeSegment,
    onSegmentChange: handleSegmentChange,
  });

  function clearContactSelection() {
    router.push(
      buildHubHref(listData, {
        contact: null,
      }),
    );
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <ContactsChannelTabs
        activeChannel={listData.activeChannelFilter}
        activeSegment={listData.activeSegment}
        activeView={listData.activeView}
        activeContactId={listData.activeContactId}
        searchQuery={listData.searchQuery}
        visibleChannelIds={visibleChannelIds}
      />

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
            {listData.activeView === "pipeline" && pipelineData ? (
              <ContactPipelineBoard
                {...pipelineData}
                activeContactId={listData.activeContactId}
                listData={listData}
              />
            ) : (
              <UnifiedContactsPanel {...listData} embedded />
            )}
          </div>

          {listData.activeView === "list" && listData.total > listData.pageSize ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={listData.page <= 1}
                asChild={listData.page > 1}
              >
                {listData.page > 1 ? (
                  <Link
                    href={buildHubHref(listData, {
                      page: listData.page - 1,
                      contact: listData.activeContactId,
                    })}
                  >
                    {CONTACTS_MESSAGES.previousPage}
                  </Link>
                ) : (
                  <span>{CONTACTS_MESSAGES.previousPage}</span>
                )}
              </Button>
              <span className="text-caption text-muted-foreground">
                {CONTACTS_MESSAGES.pageIndicator(listData.page)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!listData.hasMore}
                asChild={listData.hasMore}
              >
                {listData.hasMore ? (
                  <Link
                    href={buildHubHref(listData, {
                      page: listData.page + 1,
                      contact: listData.activeContactId,
                    })}
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
          <ContactRecordPanel
            contactId={listData.activeContactId}
            onContactDeleted={clearContactSelection}
            onBack={showRecordOnMobile ? clearContactSelection : undefined}
          />
        </main>
      </div>
    </div>
  );
}
