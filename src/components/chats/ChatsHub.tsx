"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  CHAT_CHANNEL_LIST,
  CHAT_MESSAGES,
  type ChatChannelId,
} from "@/features/chats";
import type { ChatMonitorChannelStats } from "@/types/chat.types";

type ChatsHubProps = {
  activeChannel: ChatChannelId | null;
  monitorChannels?: ChatMonitorChannelStats[];
  children: React.ReactNode;
};

export function ChatsHub({
  activeChannel,
  monitorChannels = [],
  children,
}: ChatsHubProps) {
  const pathname = usePathname();
  const isMonitor =
    pathname === DASHBOARD_ROUTES.chats ||
    pathname === `${DASHBOARD_ROUTES.chats}/`;

  const statsByChannel = new Map(
    monitorChannels.map((item) => [item.channel, item]),
  );

  const activeChannelConfig = activeChannel
    ? CHAT_CHANNEL_LIST.find((c) => c.id === activeChannel)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {CHAT_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {CHAT_MESSAGES.pageDescription}
        </p>
      </div>

      <div className="flex min-h-[min(720px,calc(100vh-14rem))] flex-1 flex-col overflow-hidden rounded-xl border bg-card lg:min-h-[32rem] lg:flex-row">
        <aside className="w-full shrink-0 border-b bg-muted/20 lg:w-64 lg:border-b-0 lg:border-r xl:w-72">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {CHAT_MESSAGES.channelsTitle}
            </p>
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
            <Link
              href={DASHBOARD_ROUTES.chats}
              className={cn(
                "flex min-w-[9.5rem] items-center gap-3 rounded-lg px-3 py-2.5 transition-colors lg:min-w-0",
                isMonitor
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <LayoutDashboardIcon className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{CHAT_MESSAGES.monitorTitle}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {CHAT_MESSAGES.viewMonitor}
                </p>
              </div>
            </Link>

            {CHAT_CHANNEL_LIST.map((channel) => {
              const href = `${DASHBOARD_ROUTES.chats}/${channel.id}`;
              const isActive = pathname.startsWith(href);
              const stats = statsByChannel.get(channel.id);

              return (
                <Link
                  key={channel.id}
                  href={href}
                  className={cn(
                    "flex min-w-[9.5rem] items-start gap-3 rounded-lg px-3 py-2.5 transition-colors lg:min-w-0",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <channel.icon className="mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {channel.label}
                      </span>
                      {stats ? (
                        <Badge
                          variant={stats.connected ? "default" : "outline"}
                          className="shrink-0 text-[10px]"
                        >
                          {stats.conversationsCount}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {channel.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeChannelConfig ? (
            <header className="shrink-0 border-b px-4 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <activeChannelConfig.icon className="size-5" />
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {activeChannelConfig.label} — {CHAT_MESSAGES.channelInbox}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {activeChannelConfig.description}
                  </p>
                </div>
              </div>
            </header>
          ) : isMonitor ? (
            <header className="shrink-0 border-b px-4 py-4 md:px-6">
              <h2 className="text-lg font-semibold tracking-tight">
                {CHAT_MESSAGES.monitorTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {CHAT_MESSAGES.monitorDescription}
              </p>
            </header>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
