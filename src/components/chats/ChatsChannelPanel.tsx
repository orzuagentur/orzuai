"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { usePollingRefresh } from "@/hooks/use-polling-refresh";
import { ArrowLeftIcon } from "lucide-react";

import { ChatInboxToolbar } from "@/components/chats/ChatInboxToolbar";
import { ChatList } from "@/components/chats/ChatList";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES, type ChatChannelId } from "@/features/chats";
import type { ChatInboxFilter } from "@/features/chats/constants";
import { filterConversations } from "@/utils/chat-inbox-filters";
import type { ChatsChannelPageData } from "@/types/chat.types";

type ChatsChannelPanelProps = ChatsChannelPageData & {
  channelId: ChatChannelId;
};

export function ChatsChannelPanel({
  channelId,
  hasBusiness,
  channel,
  channelConnected,
  aiEnabled,
  conversations,
  activeConversation,
  cannedResponses,
}: ChatsChannelPanelProps) {
  usePollingRefresh(5000);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatInboxFilter>("all");

  const filteredConversations = useMemo(
    () =>
      filterConversations(conversations, {
        searchQuery,
        filter: activeFilter,
      }),
    [activeFilter, conversations, searchQuery],
  );

  if (!hasBusiness) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <Card className="max-w-2xl shadow-none">
        <CardHeader>
          <CardTitle>{CHAT_MESSAGES.noBusinessTitle}</CardTitle>
          <CardDescription>{CHAT_MESSAGES.noBusinessDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={DASHBOARD_ROUTES.onboarding}>Start setup wizard</Link>
          </Button>
        </CardContent>
      </Card>
      </div>
    );
  }

  const activeConversationId = activeConversation?.id ?? null;
  const showChatOnMobile = Boolean(activeConversationId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col lg:flex-row">
      <aside
        className={
          showChatOnMobile
            ? "hidden h-full min-h-0 w-full flex-col border-r lg:flex lg:w-80 xl:w-96"
            : "flex h-full min-h-0 w-full flex-col border-r lg:w-80 xl:w-96"
        }
      >
        <div className="flex items-center gap-2 border-b px-3 py-2 lg:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link href={DASHBOARD_ROUTES.chats}>
              <ArrowLeftIcon className="size-4" />
              {CHAT_MESSAGES.monitorTitle}
            </Link>
          </Button>
        </div>
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">{CHAT_MESSAGES.channelInbox}</p>
          <p className="text-xs text-muted-foreground">
            {filteredConversations.length} / {conversations.length}{" "}
            {CHAT_MESSAGES.conversationsCount}
          </p>
        </div>
        <ChatInboxToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatList
            conversations={filteredConversations}
            activeConversationId={activeConversationId}
            channelId={channelId}
            hideChannelBadge
            emptyVariant={
              conversations.length > 0 && filteredConversations.length === 0
                ? "search"
                : "default"
            }
          />
        </div>
      </aside>

      <section
        className={
          showChatOnMobile
            ? "flex min-h-0 flex-1 flex-col"
            : "hidden min-h-0 flex-1 flex-col lg:flex"
        }
      >
        {showChatOnMobile ? (
          <div className="border-b px-3 py-2 lg:hidden">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${DASHBOARD_ROUTES.chats}/${channelId}`}>
                <ArrowLeftIcon className="size-4" />
                Back to list
              </Link>
            </Button>
          </div>
        ) : null}

        <ChatWindow
          conversation={activeConversation}
          aiEnabled={aiEnabled}
          channelConnected={channelConnected}
          channel={channel}
          cannedResponses={cannedResponses}
        />
      </section>
    </div>
  );
}
