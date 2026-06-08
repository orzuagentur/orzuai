"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { usePollingRefresh } from "@/hooks/use-polling-refresh";
import { ChatList } from "@/components/chats/ChatList";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxDetailsPanel } from "@/components/chats/inbox/InboxDetailsPanel";
import { InboxHeader } from "@/components/chats/inbox/InboxHeader";
import { InboxShell } from "@/components/chats/inbox/InboxShell";
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
import { sortConversations } from "@/utils/chat-inbox-priority";
import type {
  ChatMonitorChannelStats,
  ChatsChannelPageData,
} from "@/types/chat.types";

type ChatsChannelPanelProps = ChatsChannelPageData & {
  channelId: ChatChannelId;
  channelStats: ChatMonitorChannelStats[];
};

export function ChatsChannelPanel({
  channelId,
  channelStats,
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
  const [draft, setDraft] = useState("");

  const filteredConversations = useMemo(
    () =>
      sortConversations(
        filterConversations(conversations, {
          searchQuery,
          filter: activeFilter,
        }),
        "latest",
      ),
    [activeFilter, conversations, searchQuery],
  );

  if (!hasBusiness) {
    return (
      <Card className="m-4 max-w-2xl shadow-none md:m-6">
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
    );
  }

  const activeConversationId = activeConversation?.id ?? null;
  const showChatOnMobile = Boolean(activeConversationId);

  return (
    <InboxShell
      showChatOnMobile={showChatOnMobile}
      header={
        <InboxHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          aiChannel={channel}
          aiEnabled={aiEnabled}
        />
      }
      listColumn={
        <>
          <InboxChannelTabs activeChannel={channelId} channelStats={channelStats} />

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatList
              conversations={filteredConversations}
              activeConversationId={activeConversationId}
              channelId={channelId}
              hideChannelBadge
              variant="inbox"
              emptyVariant={
                conversations.length > 0 && filteredConversations.length === 0
                  ? "search"
                  : "default"
              }
            />
          </div>
        </>
      }
      chatColumn={
        <>
          {showChatOnMobile ? (
            <div className="border-b px-3 py-2 lg:hidden">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`${DASHBOARD_ROUTES.chats}/${channelId}`}>
                  <ArrowLeftIcon className="size-4" />
                  {CHAT_MESSAGES.pageTitle}
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
            layout="inbox"
            draft={draft}
            onDraftChange={setDraft}
          />
        </>
      }
      detailsColumn={
        <InboxDetailsPanel
          conversation={activeConversation}
          cannedResponses={cannedResponses}
          onUseSuggestedReply={setDraft}
        />
      }
    />
  );
}
