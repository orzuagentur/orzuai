"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BotIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_CHANNEL_LIST, CHAT_MESSAGES } from "@/features/chats";
import type { ChatsMonitorData } from "@/types/chat.types";
import { formatRelativeTime } from "@/utils/dashboard";

type ChatsMonitorPanelProps = ChatsMonitorData;

export function ChatsMonitorPanel({
  hasBusiness,
  channels,
  totalConversations,
  totalMessages,
}: ChatsMonitorPanelProps) {
  if (!hasBusiness) {
    return null;
  }

  const statsByChannel = new Map(channels.map((item) => [item.channel, item]));

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquareIcon className="size-4" />
              All conversations
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{totalConversations}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BotIcon className="size-4" />
              Total messages
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{totalMessages}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {CHAT_CHANNEL_LIST.map((channel) => {
          const stats = statsByChannel.get(channel.id);
          const connected = stats?.connected ?? false;

          return (
            <Card key={channel.id} className="shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <channel.icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{channel.label}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {channel.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={connected ? "default" : "outline"}>
                    {connected ? "Connected" : "Offline"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {CHAT_MESSAGES.conversationsCount}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {stats?.conversationsCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Messages</p>
                    <p className="font-semibold tabular-nums">
                      {stats?.totalMessages ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">AI replies</p>
                    <p className="font-semibold tabular-nums">
                      {stats?.aiReplies ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last activity</p>
                    <p className="font-medium">
                      {stats?.lastActivityAt
                        ? formatRelativeTime(stats.lastActivityAt)
                        : "—"}
                    </p>
                  </div>
                </div>

                {!connected ? (
                  <p className="text-xs text-muted-foreground">
                    {CHAT_MESSAGES.notConnectedHint}
                  </p>
                ) : null}

                <Button asChild className="w-full" variant={connected ? "default" : "outline"}>
                  <Link href={`${DASHBOARD_ROUTES.chats}/${channel.id}`}>
                    {CHAT_MESSAGES.openChannel}
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 py-6">
          <UsersIcon className="size-5 text-muted-foreground" />
          <p className="flex-1 text-sm text-muted-foreground">
            Select a channel in the sidebar or open an inbox above to view contacts
            and reply.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
