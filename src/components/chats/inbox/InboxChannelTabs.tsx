"use client";

import Link from "next/link";
import { LayoutGridIcon, StarIcon } from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_CHANNEL_LIST, CHAT_MESSAGES } from "@/features/chats";
import type { ChatChannelId } from "@/features/chats";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { cn } from "@/lib/utils";
import type { MessagingChannel } from "@/types/database.types";

export type InboxChannelTabId = ChatChannelId | "all" | "favorites";

type InboxChannelTabsProps = {
  activeChannel: InboxChannelTabId;
  unreadByChannel?: Partial<Record<MessagingChannel, number>>;
  className?: string;
};

export function InboxChannelTabs({
  activeChannel,
  unreadByChannel = {},
  className,
}: InboxChannelTabsProps) {
  const totalUnread = Object.values(unreadByChannel).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 overflow-x-auto border-b px-4 py-2",
        className,
      )}
    >
      <Link
        href={DASHBOARD_ROUTES.chats}
        title={CHAT_MESSAGES.viewAll}
        aria-label={`${CHAT_MESSAGES.viewAll}${totalUnread > 0 ? ` (${totalUnread} unread)` : ""}`}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          activeChannel === "all"
            ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <LayoutGridIcon className="size-5" />
        {totalUnread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        ) : null}
      </Link>

      <Link
        href={DASHBOARD_ROUTES.chatsFavorites}
        title={CHAT_MESSAGES.favoritesTabLabel}
        aria-label={CHAT_MESSAGES.favoritesTabLabel}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          activeChannel === "favorites"
            ? "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <StarIcon
          className={cn(
            "size-5",
            activeChannel === "favorites" ? "fill-amber-500 text-amber-500" : "",
          )}
        />
      </Link>

      {CHAT_CHANNEL_LIST.map((channel) => {
        const unreadCount = unreadByChannel[channel.id] ?? 0;
        const isActive = activeChannel === channel.id;
        const href = `${DASHBOARD_ROUTES.chats}/${channel.id}`;

        return (
          <Link
            key={channel.id}
            href={href}
            title={`${channel.label}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            aria-label={`${channel.label}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            className={cn(
              "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              isActive
                ? "bg-primary/15 ring-1 ring-primary/30"
                : "hover:bg-muted/60",
            )}
          >
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-md",
                getChannelIconContainerClassName(channel.id),
              )}
            >
              <channel.icon className="size-4" />
            </div>
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
