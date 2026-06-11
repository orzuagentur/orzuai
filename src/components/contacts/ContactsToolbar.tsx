"use client";

import { FilterIcon, PlusIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  CONTACT_SEGMENT_FILTERS,
  CONTACTS_MESSAGES,
  LEAD_SEGMENT_FILTERS,
} from "@/features/contacts/constants";
import { cn } from "@/lib/utils";
import type { ContactSegment, LeadSegment } from "@/types/contact.types";
import type { ContactsChromeConfig } from "@/components/contacts/contacts-chrome-context";

type ContactsToolbarProps = ContactsChromeConfig & {
  className?: string;
};

function activeFilterSummary(config: ContactsChromeConfig): string {
  if (config.activeTab === "deals") {
    return config.dealsView === "list"
      ? CONTACTS_MESSAGES.viewList
      : CONTACTS_MESSAGES.viewKanban;
  }

  if (config.activeView === "pipeline") {
    return CONTACTS_MESSAGES.viewPipeline;
  }

  if (config.activeTab === "leads" && config.activeLeadSegment !== "all_leads") {
    return (
      LEAD_SEGMENT_FILTERS.find((item) => item.id === config.activeLeadSegment)
        ?.label ?? CONTACTS_MESSAGES.segmentAllLeads
    );
  }

  if (config.activeTab === "contacts" && config.activeSegment !== "all") {
    return (
      CONTACT_SEGMENT_FILTERS.find((item) => item.id === config.activeSegment)
        ?.label ?? CONTACTS_MESSAGES.filterAll
    );
  }

  return CONTACTS_MESSAGES.viewList;
}

export function ContactsToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  activeTab,
  activeView = "list",
  onViewChange,
  activeSegment = "all",
  onSegmentChange,
  activeLeadSegment = "all_leads",
  onLeadSegmentChange,
  dealsView = "kanban",
  onDealsViewChange,
  onNewDeal,
  className,
}: ContactsToolbarProps) {
  const placeholder = searchPlaceholder ?? CONTACTS_MESSAGES.searchPlaceholder;

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2", className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-[9rem] md:max-w-xs lg:max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="h-8 pl-8 text-sm"
          aria-label={placeholder}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2">
            <FilterIcon className="size-3.5" />
            <span className="hidden lg:inline">
              {activeFilterSummary({
                activeTab,
                searchQuery,
                onSearchChange,
                activeView,
                onViewChange,
                activeSegment,
                onSegmentChange,
                activeLeadSegment,
                onLeadSegmentChange,
                dealsView,
                onDealsViewChange,
                onNewDeal,
              })}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{CONTACTS_MESSAGES.filtersLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {activeTab === "deals" ? (
            <>
              <DropdownMenuItem
                onClick={() => onDealsViewChange?.("kanban")}
              >
                {CONTACTS_MESSAGES.viewKanban}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDealsViewChange?.("list")}>
                {CONTACTS_MESSAGES.viewList}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => onViewChange?.("list")}>
                {CONTACTS_MESSAGES.viewList}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange?.("pipeline")}>
                {CONTACTS_MESSAGES.viewPipeline}
              </DropdownMenuItem>
              {activeView === "list" && activeTab === "contacts" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    {CONTACTS_MESSAGES.segmentsLabel}
                  </DropdownMenuLabel>
                  {CONTACT_SEGMENT_FILTERS.map((filter) => (
                    <DropdownMenuItem
                      key={filter.id}
                      onClick={() =>
                        onSegmentChange?.(filter.id as ContactSegment)
                      }
                    >
                      {filter.label}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
              {activeView === "list" && activeTab === "leads" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    {CONTACTS_MESSAGES.segmentsLabel}
                  </DropdownMenuLabel>
                  {LEAD_SEGMENT_FILTERS.map((filter) => (
                    <DropdownMenuItem
                      key={filter.id}
                      onClick={() =>
                        onLeadSegmentChange?.(filter.id as LeadSegment)
                      }
                    >
                      {filter.label}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeTab === "deals" && onNewDeal ? (
        <Button
          type="button"
          size="sm"
          className="hidden h-8 gap-1 px-2 sm:inline-flex"
          onClick={onNewDeal}
        >
          <PlusIcon className="size-3.5" />
          <span className="hidden lg:inline">{CONTACTS_MESSAGES.newDeal}</span>
        </Button>
      ) : null}
    </div>
  );
}
