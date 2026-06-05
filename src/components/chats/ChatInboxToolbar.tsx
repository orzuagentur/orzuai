"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHAT_MESSAGES, type ChatInboxFilter } from "@/features/chats/constants";
import { cn } from "@/lib/utils";

type ChatInboxToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: ChatInboxFilter;
  onFilterChange: (filter: ChatInboxFilter) => void;
  className?: string;
};

const FILTERS: Array<{ id: ChatInboxFilter; label: string }> = [
  { id: "all", label: CHAT_MESSAGES.filterAll },
  { id: "ai_handled", label: CHAT_MESSAGES.filterAiHandled },
  { id: "needs_human", label: CHAT_MESSAGES.filterNeedsHuman },
  { id: "active", label: CHAT_MESSAGES.filterActive },
];

export function ChatInboxToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  className,
}: ChatInboxToolbarProps) {
  return (
    <div className={cn("space-y-3 border-b px-4 py-3", className)}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={CHAT_MESSAGES.searchPlaceholder}
          className="pl-9"
          aria-label={CHAT_MESSAGES.searchPlaceholder}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            size="sm"
            variant={activeFilter === filter.id ? "secondary" : "ghost"}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
