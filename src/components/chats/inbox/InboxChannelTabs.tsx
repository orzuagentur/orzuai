"use client";

import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_CHANNEL_LIST, CHAT_MESSAGES } from "@/features/chats";
import type { ChatChannelId } from "@/features/chats";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { cn } from "@/lib/utils";
import type { ChatMonitorChannelStats } from "@/types/chat.types";

type InboxChannelTabsProps = {
  activeChannel: ChatChannelId | "all";
  channelStats: ChatMonitorChannelStats[];
  className?: string;
};

export function InboxChannelTabs({
  activeChannel,
  channelStats,
  className,
}: InboxChannelTabsProps) {
  const statsByChannel = new Map(
    channelStats.map((item) => [item.channel, item]),
  );
  const totalConversations = channelStats.reduce(
    (sum, item) => sum + item.conversationsCount,
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
        aria-label={`${CHAT_MESSAGES.viewAll} (${totalConversations})`}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          activeChannel === "all"
            ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <LayoutGridIcon className="size-5" />
        {totalConversations > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {totalConversations > 99 ? "99+" : totalConversations}
          </span>
        ) : null}
      </Link>

      {CHAT_CHANNEL_LIST.map((channel) => {
        const stats = statsByChannel.get(channel.id);
        const count = stats?.conversationsCount ?? 0;
        const isActive = activeChannel === channel.id;
        const href = `${DASHBOARD_ROUTES.chats}/${channel.id}`;

        return (
          <Link
            key={channel.id}
            href={href}
            title={`${channel.label}${count > 0 ? ` (${count})` : ""}`}
            aria-label={`${channel.label}${count > 0 ? ` (${count})` : ""}`}
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
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
