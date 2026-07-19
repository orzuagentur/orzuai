"use client";

import { useRef, useState } from "react";
import { FilterIcon, LayoutGridIcon, PlusIcon, SearchIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContactsChromeConfig } from "@/components/contacts/contacts-chrome-context";
import {
  CONTACT_CHANNEL_FILTERS,
  CONTACTS_MESSAGES,
} from "@/features/contacts/constants";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";

type ContactsToolbarProps = ContactsChromeConfig & {
  className?: string;
};

function activeChannelLabel(activeChannel: MessagingChannel | null): string {
  if (!activeChannel) {
    return CONTACTS_MESSAGES.filterAll;
  }

  return (
    CONTACT_CHANNEL_FILTERS.find((item) => item.id === activeChannel)?.label ??
    CONTACTS_MESSAGES.filterAll
  );
}

export function ContactsToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  activeTab,
  onNewDeal,
  activeChannel = null,
  onChannelChange,
  visibleChannelIds = [],
  voiceInboxEnabled = false,
  smsInboxEnabled = false,
  className,
}: ContactsToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const placeholder = searchPlaceholder ?? CONTACTS_MESSAGES.searchPlaceholder;

  function openFilter() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setFilterOpen(true);
  }

  function scheduleCloseFilter() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setFilterOpen(false);
      closeTimerRef.current = null;
    }, 120);
  }

  const showChannelFilters = activeTab !== "deals" && Boolean(onChannelChange);
  const visibleChannels = CONTACT_CHANNEL_FILTERS.filter((filter) => {
    if (filter.id === null) return false;
    if (filter.id === "voice") return voiceInboxEnabled;
    if (filter.id === "sms") return smsInboxEnabled;
    return visibleChannelIds.includes(filter.id);
  });

  const hasActiveFilter = Boolean(activeChannel);

  function selectChannel(channel: MessagingChannel | null) {
    onChannelChange?.(channel);
    setFilterOpen(false);
  }

  if (!showChannelFilters && activeTab !== "deals") {
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
      </div>
    );
  }

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

      {showChannelFilters ? (
        <div
          className="relative shrink-0"
          onMouseEnter={openFilter}
          onMouseLeave={scheduleCloseFilter}
        >
          <Button
            type="button"
            size="icon"
            variant={hasActiveFilter ? "default" : "outline"}
            className="size-8"
            aria-label={CONTACTS_MESSAGES.filtersLabel}
            aria-expanded={filterOpen}
          >
            <FilterIcon className="size-3.5" />
          </Button>

          {filterOpen ? (
            <div
              className="absolute top-full right-0 z-50 mt-1.5 w-60 rounded-xl border bg-popover p-3 text-popover-foreground shadow-md"
              onMouseEnter={openFilter}
              onMouseLeave={scheduleCloseFilter}
            >
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {CONTACTS_MESSAGES.channelsLabel}
              </p>
              <div className="grid gap-1">
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                    !activeChannel && "bg-muted font-medium",
                  )}
                  onClick={() => selectChannel(null)}
                >
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted/60">
                    <LayoutGridIcon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {CONTACTS_MESSAGES.filterAll}
                  </span>
                </button>

                {visibleChannels.map((filter) => {
                  const channel = filter.id!;
                  const isActive = activeChannel === channel;
                  return (
                    <button
                      key={channel}
                      type="button"
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                        isActive && "bg-muted font-medium",
                      )}
                      onClick={() => selectChannel(channel)}
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md",
                          getChannelIconContainerClassName(channel),
                        )}
                      >
                        <ChannelBrandIcon channel={channel} className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {filter.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 truncate px-1 text-[11px] text-muted-foreground">
                {activeChannelLabel(activeChannel)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

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
