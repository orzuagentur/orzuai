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
        "flex shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-2",
        className,
      )}
    >
      <Link
        href={DASHBOARD_ROUTES.chats}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          activeChannel === "all"
            ? "bg-primary/10 font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <LayoutGridIcon className="size-4" />
        <span>{CHAT_MESSAGES.viewAll}</span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums">
          {totalConversations}
        </span>
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
            title={channel.label}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-md",
                getChannelIconContainerClassName(channel.id),
              )}
            >
              <channel.icon className="size-4" />
            </div>
            <span className="hidden sm:inline">{channel.label}</span>
            {count > 0 ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
