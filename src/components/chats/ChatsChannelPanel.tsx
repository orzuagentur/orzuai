"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { fetchChatsChannelInitialAction } from "@/features/chats/actions/fetch-chats-channel-initial";
import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import { useInboxActiveConversation } from "@/hooks/use-inbox-active-conversation";
import { useInboxListPolling } from "@/hooks/use-inbox-list-polling";
import { useInboxListRealtime } from "@/hooks/use-inbox-list-realtime";
import { ChatList } from "@/components/chats/ChatList";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { ConversationListSkeleton } from "@/components/chats/ConversationListSkeleton";
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
  ConversationListItem,
} from "@/types/chat.types";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { MessagingChannel } from "@/types/database.types";
import {
  countUnreadByChannel,
  markConversationListItemRead,
} from "@/utils/conversation-unread";

type ChatsChannelPanelProps = {
  channelId: ChatChannelId;
} & Partial<
  ChatsChannelPageData & {
    channelStats: ChatMonitorChannelStats[];
  }
>;

export function ChatsChannelPanel({
  channelId,
  hasBusiness: initialHasBusiness,
  channel: initialChannel,
  channelStats: initialChannelStats,
  channelConnected: initialChannelConnected,
  aiEnabled: initialAiEnabled,
  conversations: initialConversations,
  cannedResponses: initialCannedResponses,
}: ChatsChannelPanelProps) {
  const usesClientBootstrap = initialConversations === undefined;
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation")?.trim() || null;

  const [hasBusiness, setHasBusiness] = useState(initialHasBusiness ?? true);
  const [channel, setChannel] = useState<MessagingChannel>(
    initialChannel ?? channelId,
  );
  const [channelStats, setChannelStats] = useState<ChatMonitorChannelStats[]>(
    initialChannelStats ?? [],
  );
  const visibleChannelIds = useMemo(
    () => channelStats.map((item) => item.channel),
    [channelStats],
  );
  const [channelConnected, setChannelConnected] = useState(
    initialChannelConnected ?? false,
  );
  const [channelAiEnabled, setChannelAiEnabled] = useState<boolean | null>(
    initialAiEnabled ?? null,
  );
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    initialConversations ?? [],
  );
  const [bootstrapCannedResponses, setBootstrapCannedResponses] = useState<
    CannedResponseItem[]
  >(initialCannedResponses ?? []);
  const [isInitialLoading, setIsInitialLoading] = useState(usesClientBootstrap);

  const {
    selectedConversationId,
    selectConversation,
    conversation: activeConversation,
    channelConnected: activeChannelConnected,
    aiEnabled,
    cannedResponses,
    isLoadingConversation,
    appendMessage,
    removeMessage,
    isClientTyping,
    refreshConversation,
  } = useInboxActiveConversation({
    initialConversationId,
    initialConversation: null,
    initialChannelConnected: channelConnected,
    initialAiEnabled: channelAiEnabled,
    initialCannedResponses: bootstrapCannedResponses,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatInboxFilter>("all");
  const [draft, setDraft] = useState("");
  const [suggestReplyOpen, setSuggestReplyOpen] = useState(false);

  useEffect(() => {
    if (!usesClientBootstrap) {
      return;
    }

    let cancelled = false;

    void fetchChatsChannelInitialAction({ channel: channelId }).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.success) {
        setIsInitialLoading(false);
        return;
      }

      const data = result.data;
      setHasBusiness(data.hasBusiness);
      setChannel(data.channel);
      setChannelStats(data.channelStats);
      setChannelConnected(data.channelConnected);
      setChannelAiEnabled(data.aiEnabled);
      setConversations(data.conversations);
      setBootstrapCannedResponses(data.cannedResponses);
      setIsInitialLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [channelId, usesClientBootstrap]);

  useEffect(() => {
    if (usesClientBootstrap) {
      return;
    }

    setHasBusiness(initialHasBusiness ?? true);
    setChannel(initialChannel ?? channelId);
    setChannelStats(initialChannelStats ?? []);
    setChannelConnected(initialChannelConnected ?? false);
    setChannelAiEnabled(initialAiEnabled ?? null);
    setConversations(initialConversations ?? []);
    setBootstrapCannedResponses(initialCannedResponses ?? []);
  }, [
    channelId,
    initialAiEnabled,
    initialCannedResponses,
    initialChannel,
    initialChannelConnected,
    initialChannelStats,
    initialConversations,
    initialHasBusiness,
    usesClientBootstrap,
  ]);

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

  const hasActiveListFilters =
    Boolean(searchQuery.trim()) || activeFilter !== "all";

  useInboxListRealtime({
    enabled: hasBusiness && !isInitialLoading,
    channelFilter: channelId,
    selectedConversationId,
    hasActiveFilters: hasActiveListFilters,
    onConversationsChange: setConversations,
    onRefresh: () => {
      void refreshConversations();
    },
  });

  useInboxListPolling(() => {
    if (!isInitialLoading) {
      void refreshConversations();
    }
  });

  const unreadByChannel = useMemo(
    () => countUnreadByChannel(conversations),
    [conversations],
  );

  const handleContactFavoriteChange = useCallback(
    (contactId: string, isFavorite: boolean) => {
      setConversations((current) =>
        current.map((item) =>
          item.contactId === contactId
            ? { ...item, contactIsFavorite: isFavorite }
            : item,
        ),
      );
      void refreshConversation(true);
    },
    [refreshConversation],
  );

  const handleConversationSelect = useCallback(
    (conversationId: string | null) => {
      selectConversation(conversationId);

      if (!conversationId) {
        return;
      }

      setConversations((current) =>
        markConversationListItemRead(current, conversationId),
      );
    },
    [selectConversation],
  );

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

  const selectedListItem = useMemo(() => {
    if (!selectedConversationId) {
      return null;
    }

    return (
      conversations.find((item) => item.id === selectedConversationId) ?? null
    );
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    setConversations((current) =>
      markConversationListItemRead(current, selectedConversationId),
    );
  }, [selectedConversationId]);

  useInboxChromeRegistration(
    hasBusiness && !isInitialLoading
      ? {
          searchQuery,
          onSearchChange: setSearchQuery,
          activeFilter,
          onFilterChange: setActiveFilter,
          aiChannel: channel,
          aiEnabled: aiEnabled ?? channelAiEnabled,
        }
      : null,
  );

  if (!isInitialLoading && !hasBusiness) {
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

  const activeConversationId = selectedConversationId;
  const showChatOnMobile = Boolean(activeConversationId);
  const resolvedChannelConnected = activeConversation
    ? activeChannelConnected
    : channelConnected;

  return (
    <InboxShell
      showChatOnMobile={showChatOnMobile}
      channelTabs={
        <InboxChannelTabs
          activeChannel={channelId}
          unreadByChannel={unreadByChannel}
          visibleChannelIds={visibleChannelIds}
        />
      }
      listColumn={
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isInitialLoading ? (
            <ConversationListSkeleton rows={8} />
          ) : (
            <ChatList
              conversations={filteredConversations}
              activeConversationId={activeConversationId}
              channelId={channelId}
              hideChannelBadge
              onConversationSelect={handleConversationSelect}
              variant="inbox"
              emptyVariant={
                conversations.length > 0 && filteredConversations.length === 0
                  ? "search"
                  : "default"
              }
            />
          )}
        </div>
      }
      chatColumn={
        <div className="flex h-full min-h-0 flex-col">
          {showChatOnMobile ? (
            <div className="shrink-0 border-b px-3 py-2 lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => handleConversationSelect(null)}
              >
                <ArrowLeftIcon className="size-4" />
                {CHAT_MESSAGES.pageTitle}
              </Button>
            </div>
          ) : null}

          <ChatWindow
            conversation={activeConversation}
            isClientTyping={isClientTyping}
            aiEnabled={aiEnabled ?? channelAiEnabled}
            channelConnected={resolvedChannelConnected}
            channel={channel}
            cannedResponses={cannedResponses}
            isLoadingConversation={isLoadingConversation}
            loadingPreview={
              selectedListItem
                ? {
                    contactName: selectedListItem.contactName,
                    contactPhone: selectedListItem.contactPhone,
                    channel: selectedListItem.channel,
                  }
                : null
            }
            layout="inbox"
            draft={draft}
            onDraftChange={setDraft}
            className="min-h-0 min-w-0 flex-1"
            suggestReplyOpen={suggestReplyOpen}
            onSuggestReplyOpenChange={setSuggestReplyOpen}
            onMessageSent={(message) => {
              appendMessage(message);
              void refreshConversations();
            }}
            onMessageRemoved={removeMessage}
            onContactDeleted={() => {
              handleConversationSelect(null);
              void refreshConversations();
            }}
            onContactFavoriteChange={handleContactFavoriteChange}
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
