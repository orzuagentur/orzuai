"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import { useInboxListPolling } from "@/hooks/use-inbox-list-polling";
import { ChatList } from "@/components/chats/ChatList";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxDetailsPanel } from "@/components/chats/inbox/InboxDetailsPanel";
import { useInboxChromeRegistration } from "@/components/chats/inbox/inbox-chrome-context";
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
  conversations: initialConversations,
  activeConversation,
  cannedResponses,
}: ChatsChannelPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatInboxFilter>("all");
  const [draft, setDraft] = useState("");
  const [suggestReplyOpen, setSuggestReplyOpen] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  const refreshConversations = useCallback(async () => {
    const result = await fetchMonitorConversationsAction({
      channel: channelId,
      offset: 0,
      limit: 100,
      view: "all",
      filter: "all",
      sort: "latest",
    });

    if (result.success) {
      setConversations(result.data.items);
    }
  }, [channelId]);

  useInboxListPolling(() => {
    void refreshConversations();
  });

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

  useInboxChromeRegistration(
    hasBusiness
      ? {
          searchQuery,
          onSearchChange: setSearchQuery,
          activeFilter,
          onFilterChange: setActiveFilter,
          aiChannel: channel,
          aiEnabled,
        }
      : null,
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
      channelTabs={
        <InboxChannelTabs activeChannel={channelId} channelStats={channelStats} />
      }
      listColumn={
        <>
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
        <div className="flex h-full min-h-0 flex-col">
          {showChatOnMobile ? (
            <div className="shrink-0 border-b px-3 py-2 lg:hidden">
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
            className="min-h-0 flex-1"
            suggestReplyOpen={suggestReplyOpen}
            onSuggestReplyOpenChange={setSuggestReplyOpen}
          />
        </div>
      }
      detailsColumn={
        <InboxDetailsPanel
          conversation={activeConversation}
          cannedResponses={cannedResponses}
          onUseSuggestedReply={setDraft}
          onGenerateReply={() => setSuggestReplyOpen(true)}
        />
      }
    />
  );
}
