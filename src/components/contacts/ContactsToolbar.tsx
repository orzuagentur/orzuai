"use client";

import { FilterIcon, SearchIcon } from "lucide-react";

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
} from "@/features/contacts/constants";
import { cn } from "@/lib/utils";
import type { ContactSegment } from "@/types/contact.types";
import type { ContactsChromeConfig } from "@/components/contacts/contacts-chrome-context";

type ContactsToolbarProps = ContactsChromeConfig & {
  className?: string;
};

function activeFilterSummary(
  activeView: "list" | "pipeline",
  activeSegment: ContactSegment,
): string {
  if (activeView === "pipeline") {
    return CONTACTS_MESSAGES.viewPipeline;
  }

  if (activeSegment !== "all") {
    return (
      CONTACT_SEGMENT_FILTERS.find((item) => item.id === activeSegment)?.label ??
      CONTACTS_MESSAGES.filterAll
    );
  }

  return CONTACTS_MESSAGES.viewList;
}

export function ContactsToolbar({
  searchQuery,
  onSearchChange,
  activeView,
  onViewChange,
  activeSegment,
  onSegmentChange,
  className,
}: ContactsToolbarProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2", className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-[9rem] md:max-w-xs lg:max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={CONTACTS_MESSAGES.searchPlaceholder}
          className="h-8 pl-8 text-sm"
          aria-label={CONTACTS_MESSAGES.searchPlaceholder}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2">
            <FilterIcon className="size-3.5" />
            <span className="hidden lg:inline">
              {activeFilterSummary(activeView, activeSegment)}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{CONTACTS_MESSAGES.filtersLabel}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onViewChange("list")}>
            {CONTACTS_MESSAGES.viewList}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewChange("pipeline")}>
            {CONTACTS_MESSAGES.viewPipeline}
          </DropdownMenuItem>
          {activeView === "list" ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{CONTACTS_MESSAGES.segmentsLabel}</DropdownMenuLabel>
              {CONTACT_SEGMENT_FILTERS.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => onSegmentChange(filter.id)}
                >
                  {filter.label}
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
