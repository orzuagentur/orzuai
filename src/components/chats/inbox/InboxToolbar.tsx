"use client";

import { useRef, useState } from "react";
import { FilterIcon, LayoutGridIcon, SearchIcon, StarIcon } from "lucide-react";

import { ComposeWriteButton } from "@/components/chats/inbox/ComposeWriteButton";
import { ChannelBrandIcon, SmsIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InboxChannelTabId } from "@/components/chats/inbox/InboxChannelTabs";
import type { InboxChromeConfig } from "@/components/chats/inbox/inbox-chrome-context";
import { CHAT_CHANNEL_LIST } from "@/features/chats/channel-config";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { SMS_MESSAGES } from "@/features/sms/constants";
import { cn } from "@/lib/utils";
import { countChannelsWithUnread } from "@/utils/conversation-unread";

type InboxToolbarProps = InboxChromeConfig & {
  className?: string;
};

export function InboxToolbar({
  searchQuery,
  onSearchChange,
  channelTab = "all",
  onChannelTabChange,
  visibleChannelIds = [],
  unreadByChannel = {},
  smsInboxEnabled = false,
  className,
}: InboxToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

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

  const visibleChannels = CHAT_CHANNEL_LIST.filter((channel) =>
    visibleChannelIds.includes(channel.id),
  );
  const channelsWithUnread = countChannelsWithUnread(unreadByChannel);
  const hasActiveFilter = channelTab !== "all";

  function selectChannel(tab: InboxChannelTabId) {
    onChannelTabChange?.(tab);
    setFilterOpen(false);
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2", className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-[9rem] md:max-w-xs lg:max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={CHAT_MESSAGES.searchMessagesPlaceholder}
          className="h-8 pl-8 text-sm"
          aria-label={CHAT_MESSAGES.searchMessagesPlaceholder}
        />
      </div>

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
          aria-label={CHAT_MESSAGES.channelRailLabel}
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
              {CHAT_MESSAGES.channelRailLabel}
            </p>
            <div className="grid gap-1">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                  channelTab === "all" && "bg-muted font-medium",
                )}
                onClick={() => selectChannel("all")}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md",
                    channelTab === "all" ? "bg-background" : "bg-muted/60",
                  )}
                >
                  <LayoutGridIcon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate">{CHAT_MESSAGES.viewAll}</span>
                {channelsWithUnread > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                    {channelsWithUnread}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                  channelTab === "favorites" && "bg-muted font-medium",
                )}
                onClick={() => selectChannel("favorites")}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md",
                    channelTab === "favorites" ? "bg-background" : "bg-muted/60",
                  )}
                >
                  <StarIcon
                    className={cn(
                      "size-3.5",
                      channelTab === "favorites"
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground",
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {CHAT_MESSAGES.channelRailFavorites}
                </span>
              </button>

              {visibleChannels.map((channel) => {
                const unread = unreadByChannel[channel.id] ?? 0;
                const isActive = channelTab === channel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                      isActive && "bg-muted font-medium",
                    )}
                    onClick={() => selectChannel(channel.id)}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md",
                        getChannelIconContainerClassName(channel.id),
                      )}
                    >
                      <ChannelBrandIcon channel={channel.id} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{channel.label}</span>
                    {unread > 0 ? (
                      <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                        {unread}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {smsInboxEnabled ? (
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                    channelTab === "sms" && "bg-muted font-medium",
                  )}
                  onClick={() => selectChannel("sms")}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md",
                      getChannelIconContainerClassName("sms"),
                    )}
                  >
                    <SmsIcon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {SMS_MESSAGES.inboxTabLabel}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <ComposeWriteButton className="ml-auto" />
    </div>
  );
}
