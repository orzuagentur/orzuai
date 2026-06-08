"use client";

import {
  BellIcon,
  BotIcon,
  FilterIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";

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
import { useToggleChatAi } from "@/hooks/use-toggle-chat-ai";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";

type InboxHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: ChatInboxFilter;
  onFilterChange: (filter: ChatInboxFilter) => void;
  aiChannel: MessagingChannel | null;
  aiEnabled: boolean | null;
  onAiToggle?: () => void;
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

export function InboxHeader({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  aiChannel,
  aiEnabled,
  onAiToggle,
  className,
}: InboxHeaderProps) {
  const { toggleAi, isLoading: isAiLoading } = useToggleChatAi({
    onSuccess: onAiToggle,
  });

  const isAiOn = aiEnabled === true;
  const canToggleAi = aiChannel !== null && aiEnabled !== null;

  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">
          {CHAT_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {CHAT_MESSAGES.inboxSubtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <div className="relative min-w-[12rem] flex-1 md:w-64 md:flex-none">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={CHAT_MESSAGES.searchMessagesPlaceholder}
            className="h-9 pl-9"
            aria-label={CHAT_MESSAGES.searchMessagesPlaceholder}
          />
        </div>

        <Button
          type="button"
          variant={isAiOn ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          disabled={!canToggleAi || isAiLoading}
          onClick={() => {
            if (!aiChannel) {
              return;
            }

            void toggleAi({ enabled: !isAiOn, channel: aiChannel });
          }}
        >
          {isAiLoading ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <BotIcon className="size-3.5" />
          )}
          {CHAT_MESSAGES.aiAutoReply}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <FilterIcon className="size-3.5" />
              {activeFilterLabel(activeFilter)}
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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          aria-label={CHAT_MESSAGES.notificationsLabel}
        >
          <BellIcon className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
        </Button>
      </div>
    </header>
  );
}
