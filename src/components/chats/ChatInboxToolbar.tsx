"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CHAT_MESSAGES,
  type ChatInboxFilter,
  type ChatInboxQuickView,
  type ChatInboxSort,
} from "@/features/chats/constants";
import { cn } from "@/lib/utils";

type ChatInboxToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: ChatInboxFilter;
  onFilterChange: (filter: ChatInboxFilter) => void;
  activeSort?: ChatInboxSort;
  onSortChange?: (sort: ChatInboxSort) => void;
  activeQuickView?: ChatInboxQuickView;
  onQuickViewChange?: (view: ChatInboxQuickView) => void;
  className?: string;
};

const FILTERS: Array<{ id: ChatInboxFilter; label: string }> = [
  { id: "all", label: CHAT_MESSAGES.filterAll },
  { id: "ai_handled", label: CHAT_MESSAGES.filterAiHandled },
  { id: "needs_human", label: CHAT_MESSAGES.filterNeedsHuman },
  { id: "active", label: CHAT_MESSAGES.filterActive },
];

const SORTS: Array<{ id: ChatInboxSort; label: string }> = [
  { id: "latest", label: CHAT_MESSAGES.sortLatest },
  { id: "needs_reply_first", label: CHAT_MESSAGES.sortNeedsReplyFirst },
  { id: "channel", label: CHAT_MESSAGES.sortByChannel },
];

const QUICK_VIEWS: Array<{ id: ChatInboxQuickView; label: string }> = [
  { id: "all", label: CHAT_MESSAGES.viewAll },
  { id: "needs_reply", label: CHAT_MESSAGES.viewNeedsReply },
  { id: "high_intent", label: CHAT_MESSAGES.viewHighIntent },
];

export function ChatInboxToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange,
  activeQuickView,
  onQuickViewChange,
  className,
}: ChatInboxToolbarProps) {
  return (
    <div className={cn("space-y-3 border-b px-4 py-3", className)}>
      {activeQuickView && onQuickViewChange ? (
        <div className="flex flex-wrap gap-1">
          {QUICK_VIEWS.map((view) => (
            <Button
              key={view.id}
              type="button"
              size="sm"
              variant={activeQuickView === view.id ? "default" : "outline"}
              onClick={() => onQuickViewChange(view.id)}
            >
              {view.label}
            </Button>
          ))}
        </div>
      ) : null}

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
      <p className="text-[11px] text-muted-foreground">
        {CHAT_MESSAGES.serverSearchHint}
      </p>

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

      {activeSort && onSortChange ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {CHAT_MESSAGES.sortLabel}
          </span>
          {SORTS.map((sort) => (
            <Button
              key={sort.id}
              type="button"
              size="sm"
              variant={activeSort === sort.id ? "secondary" : "ghost"}
              onClick={() => onSortChange(sort.id)}
            >
              {sort.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
