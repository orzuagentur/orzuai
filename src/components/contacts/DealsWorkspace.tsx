"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";

import { CreateDealWithContactDialog } from "@/components/contacts/CreateDealWithContactDialog";
import { DealDetailPanel } from "@/components/contacts/DealDetailPanel";
import { DealsKanbanBoard } from "@/components/contacts/DealsKanbanBoard";
import { DealsListPanel } from "@/components/contacts/DealsListPanel";
import { ContactRecordWorkspace } from "@/components/contacts/ContactRecordWorkspace";
import { useContactsChromeRegistration } from "@/components/contacts/contacts-chrome-context";
import { Button } from "@/components/ui/button";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";
import { cn } from "@/lib/utils";
import type { CrmDealsPageData } from "@/types/crm-deal.types";
import { buildContactsHref } from "@/utils/contacts-url";

type DealsWorkspaceProps = {
  dealsData: CrmDealsPageData;
};

function buildDealsHref(
  dealsData: CrmDealsPageData,
  overrides: Parameters<typeof buildContactsHref>[0] = {},
) {
  return buildContactsHref({
    tab: "deals",
    view: dealsData.activeView === "list" ? "list" : "kanban",
    deal: dealsData.activeDealId,
    contact: dealsData.activeContactId,
    profile: dealsData.showProfilePanel,
    q: dealsData.searchQuery || null,
    stage: dealsData.activeStageFilter,
    dealStatus: dealsData.activeStatusFilter,
    page: dealsData.page,
    ...overrides,
  });
}

export function DealsWorkspace({ dealsData }: DealsWorkspaceProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(dealsData.searchQuery);
  const [createOpen, setCreateOpen] = useState(false);
  const selectedDeal =
    dealsData.kanbanDeals.find((deal) => deal.id === dealsData.activeDealId) ??
    dealsData.deals.find((deal) => deal.id === dealsData.activeDealId) ??
    null;
  const showDetailOnMobile = Boolean(dealsData.activeDealId);

  useEffect(() => {
    setSearchValue(dealsData.searchQuery);
  }, [dealsData.searchQuery]);

  useEffect(() => {
    const trimmed = searchValue.trim();

    if (trimmed === dealsData.searchQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(
        buildDealsHref(dealsData, {
          q: trimmed || null,
          page: 1,
        }),
      );
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [dealsData, router, searchValue]);

  const handleViewChange = useCallback(
    (view: "kanban" | "list") => {
      router.push(
        buildDealsHref(dealsData, {
          view,
          page: 1,
        }),
      );
    },
    [dealsData, router],
  );

  const handleNewDeal = useCallback(() => {
    setCreateOpen(true);
  }, []);

  useContactsChromeRegistration({
    activeTab: "deals",
    searchQuery: searchValue,
    onSearchChange: setSearchValue,
    dealsView: dealsData.activeView,
    onDealsViewChange: handleViewChange,
    onNewDeal: handleNewDeal,
    searchPlaceholder: CONTACTS_MESSAGES.dealsSearchPlaceholder,
  });

  async function handleDealCreated(dealId: string) {
    router.push(
      buildDealsHref(dealsData, {
        deal: dealId || null,
        contact: null,
        profile: false,
        page: 1,
      }),
    );
    router.refresh();
  }

  function clearDealSelection() {
    router.push(
      buildDealsHref(dealsData, {
        deal: null,
        contact: null,
        profile: false,
      }),
    );
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 lg:hidden">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon className="size-4" />
          {CONTACTS_MESSAGES.newDeal}
        </Button>
      </div>

      <div
        className={cn(
          "grid min-h-0 min-w-0 flex-1 overflow-hidden",
          selectedDeal
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]"
            : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col overflow-hidden",
            showDetailOnMobile && selectedDeal && "hidden lg:flex",
          )}
        >
          {dealsData.activeView === "kanban" ? (
            <DealsKanbanBoard dealsData={dealsData} />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DealsListPanel dealsData={dealsData} />
            </div>
          )}

          {dealsData.activeView === "list" && dealsData.total > dealsData.pageSize ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={dealsData.page <= 1}
                asChild={dealsData.page > 1}
              >
                {dealsData.page > 1 ? (
                  <Link
                    href={buildDealsHref(dealsData, {
                      page: dealsData.page - 1,
                    })}
                  >
                    {CONTACTS_MESSAGES.previousPage}
                  </Link>
                ) : (
                  <span>{CONTACTS_MESSAGES.previousPage}</span>
                )}
              </Button>
              <span className="text-caption text-muted-foreground">
                {CONTACTS_MESSAGES.pageIndicator(dealsData.page)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!dealsData.hasMore}
                asChild={dealsData.hasMore}
              >
                {dealsData.hasMore ? (
                  <Link
                    href={buildDealsHref(dealsData, {
                      page: dealsData.page + 1,
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
        </div>

        {selectedDeal ? (
          <aside
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden border-l",
              !showDetailOnMobile && "hidden lg:flex",
              showDetailOnMobile && "flex",
            )}
          >
            <div className="shrink-0 border-b px-3 py-2 lg:hidden">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearDealSelection}
              >
                {CONTACTS_MESSAGES.backToList}
              </Button>
            </div>

            <DealDetailPanel deal={selectedDeal} dealsData={dealsData} />

            {dealsData.showProfilePanel && dealsData.activeContactId ? (
              <div className="min-h-0 flex-1 overflow-hidden border-t">
                <ContactRecordWorkspace
                  contactId={dealsData.activeContactId}
                  profileOpen
                  onToggleProfile={() => {
                    router.replace(
                      buildDealsHref(dealsData, {
                        profile: false,
                      }),
                    );
                  }}
                />
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      <CreateDealWithContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleDealCreated}
      />
    </>
  );
}
