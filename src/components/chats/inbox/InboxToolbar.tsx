"use client";

import { FilterIcon, SearchIcon } from "lucide-react";

import { AddContactButton } from "@/components/chats/inbox/AddContactButton";
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
import { CHAT_MESSAGES, type ChatInboxFilter } from "@/features/chats/constants";
import { cn } from "@/lib/utils";
import type { InboxChromeConfig } from "@/components/chats/inbox/inbox-chrome-context";

type InboxToolbarProps = InboxChromeConfig & {
  className?: string;
};

const FILTERS: Array<{ id: ChatInboxFilter; label: string }> = [
  { id: "all", label: CHAT_MESSAGES.filterAll },
  { id: "ai_handled", label: CHAT_MESSAGES.filterAiHandled },
  { id: "needs_human", label: CHAT_MESSAGES.filterNeedsHuman },
  { id: "active", label: CHAT_MESSAGES.filterActive },
];

const activeFilterLabel = (filter: ChatInboxFilter) =>
  FILTERS.find((item) => item.id === filter)?.label ?? CHAT_MESSAGES.filterAll;

export function InboxToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  className,
}: InboxToolbarProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2", className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-[9rem] md:max-w-xs lg:max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={CHAT_MESSAGES.searchMessagesPlaceholder}
          className="h-8 pl-8 text-sm"
          aria-label={CHAT_MESSAGES.searchMessagesPlaceholder}
        />
      </div>

      <AddContactButton />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2">
            <FilterIcon className="size-3.5" />
            <span className="hidden lg:inline">{activeFilterLabel(activeFilter)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{CHAT_MESSAGES.allChannelsFilter}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FILTERS.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}
