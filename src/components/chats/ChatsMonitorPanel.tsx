"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";

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
import { fetchChatsMonitorInitialAction } from "@/features/chats/actions/fetch-chats-monitor-initial";
import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import { CHAT_MESSAGES } from "@/features/chats";
import { useInboxActiveConversation } from "@/hooks/use-inbox-active-conversation";
import {
  INBOX_LIST_POLL_FALLBACK_INTERVAL_MS,
  INBOX_LIST_POLL_INTERVAL_MS,
  useInboxListPolling,
} from "@/hooks/use-inbox-list-polling";
import { useInboxListRealtime } from "@/hooks/use-inbox-list-realtime";
import type {
  ChatInboxFilter,
  ChatInboxQuickView,
  ChatInboxSort,
} from "@/features/chats/constants";
import { INBOX_PAGE_SIZE } from "@/features/chats/constants";
import type {
  ChatMonitorChannelStats,
  ChatsMonitorPageData,
  ConversationListItem,
} from "@/types/chat.types";
import {
  countUnreadByChannel,
  markConversationListItemRead,
} from "@/utils/conversation-unread";

type ChatsMonitorPanelProps = Partial<ChatsMonitorPageData> & {
  favoritesOnly?: boolean;
};

export function ChatsMonitorPanel({
  hasBusiness: initialHasBusiness,
  channels: initialChannels,
  conversations: initialConversations,
  conversationsTotalCount: initialTotalCount,
  conversationsHasMore: initialHasMore,
  needsAttentionConversations: initialNeedsAttention,
  activeConversation: initialActiveConversation = null,
  activeChannelConnected: initialActiveChannelConnected,
  activeAiEnabled: initialActiveAiEnabled,
  activeCannedResponses: initialActiveCannedResponses,
  favoritesOnly = false,
}: ChatsMonitorPanelProps = {}) {
  const usesClientBootstrap = initialConversations === undefined;
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation")?.trim() || null;

  const [hasBusiness, setHasBusiness] = useState(initialHasBusiness ?? true);
  const [channelStats, setChannels] = useState<ChatMonitorChannelStats[]>(
    initialChannels ?? [],
  );
  const visibleChannelIds = useMemo(
    () => channelStats.map((item) => item.channel),
    [channelStats],
  );
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    initialConversations ?? [],
  );
  const [needsAttentionConversations, setNeedsAttentionConversations] =
    useState<ConversationListItem[]>(initialNeedsAttention ?? []);
  const [totalCount, setTotalCount] = useState(initialTotalCount ?? 0);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [isInitialLoading, setIsInitialLoading] = useState(
    usesClientBootstrap && !favoritesOnly,
  );
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const {
    selectedConversationId,
    selectConversation,
    conversation: activeConversation,
    channelConnected: activeChannelConnected,
    aiEnabled: activeAiEnabled,
    cannedResponses: activeCannedResponses,
    isLoadingConversation,
    isLoadingOlderMessages,
    loadOlderMessages,
    appendMessage,
    removeMessage,
    reconcileMessage,
    isClientTyping,
    refreshConversation,
  } = useInboxActiveConversation({
    initialConversationId,
    initialConversation: initialActiveConversation,
    initialChannelConnected: initialActiveChannelConnected ?? false,
    initialAiEnabled: initialActiveAiEnabled ?? null,
    initialCannedResponses: initialActiveCannedResponses ?? [],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatInboxFilter>("all");
  const [activeSort] = useState<ChatInboxSort>("latest");
  const [activeQuickView] = useState<ChatInboxQuickView>(
    favoritesOnly ? "favorites" : "all",
  );
  const [isFetching, startFetching] = useTransition();
  const [draft, setDraft] = useState("");
  const [suggestReplyOpen, setSuggestReplyOpen] = useState(false);
  const skipInitialFetchRef = useRef(!usesClientBootstrap);

  const needsAttentionIds = useMemo(
    () => new Set(needsAttentionConversations.map((item) => item.id)),
    [needsAttentionConversations],
  );

  const showNeedsAttentionSection =
    !favoritesOnly &&
    activeQuickView === "all" &&
    !debouncedSearch &&
    activeFilter === "all" &&
    needsAttentionConversations.length > 0;

  const mainConversations = useMemo(
    () =>
      showNeedsAttentionSection
        ? conversations.filter((item) => !needsAttentionIds.has(item.id))
        : conversations,
    [conversations, needsAttentionIds, showNeedsAttentionSection],
  );

  const unreadByChannel = useMemo(() => {
    const merged = new Map<string, ConversationListItem>();

    for (const conversation of [
      ...conversations,
      ...needsAttentionConversations,
    ]) {
      merged.set(conversation.id, conversation);
    }

    return countUnreadByChannel([...merged.values()]);
  }, [conversations, needsAttentionConversations]);

  const handleConversationSelect = useCallback(
    (conversationId: string | null) => {
      selectConversation(conversationId);

      if (!conversationId) {
        return;
      }

      setConversations((current) =>
        markConversationListItemRead(current, conversationId),
      );
      setNeedsAttentionConversations((current) =>
        markConversationListItemRead(current, conversationId),
      );
    },
    [selectConversation],
  );

  const selectedListItem = useMemo(() => {
    if (!selectedConversationId) {
      return null;
    }

    return (
      conversations.find((item) => item.id === selectedConversationId) ??
      needsAttentionConversations.find((item) => item.id === selectedConversationId) ??
      null
    );
  }, [conversations, needsAttentionConversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    setConversations((current) =>
      markConversationListItemRead(current, selectedConversationId),
    );
    setNeedsAttentionConversations((current) =>
      markConversationListItemRead(current, selectedConversationId),
    );
  }, [selectedConversationId]);

  const activeConversationId = selectedConversationId;
  const showChatOnMobile = Boolean(activeConversationId);
  const aiChannel = activeConversation?.channel ?? null;

  const fetchConversations = useCallback(
    (offset: number, append: boolean, silent = false) => {
      const run = async () => {
        const [listResult, needsAttentionResult] = await Promise.all([
          fetchMonitorConversationsAction({
            offset,
            limit: INBOX_PAGE_SIZE,
            search: debouncedSearch || undefined,
            view: activeQuickView,
            filter: activeFilter,
            sort: activeSort,
          }),
          offset === 0 && activeQuickView === "all" && !debouncedSearch
            ? fetchMonitorConversationsAction({
                offset: 0,
                limit: 8,
                view: "needs_reply",
                filter: "all",
                sort: "latest",
              })
            : Promise.resolve(null),
        ]);

        if (!listResult.success) {
          return;
        }

        setConversations((current) =>
          append
            ? [...current, ...listResult.data.items]
            : listResult.data.items,
        );
        setTotalCount(listResult.data.totalCount);
        setHasMore(listResult.data.hasMore);

        if (needsAttentionResult?.success) {
          setNeedsAttentionConversations(needsAttentionResult.data.items);
        } else if (offset === 0 && activeQuickView !== "all") {
          setNeedsAttentionConversations([]);
        }
      };

      if (silent) {
        void run();
        return;
      }

      startFetching(run);
    },
    [activeFilter, activeQuickView, activeSort, debouncedSearch],
  );

  const handleContactFavoriteChange = useCallback(
    (contactId: string, isFavorite: boolean) => {
      if (favoritesOnly && !isFavorite) {
        setConversations((current) =>
          current.filter((item) => item.contactId !== contactId),
        );

        if (
          selectedConversationId &&
          conversations.some(
            (item) =>
              item.id === selectedConversationId &&
              item.contactId === contactId,
          )
        ) {
          selectConversation(null);
        }

        return;
      }

      setConversations((current) =>
        current.map((item) =>
          item.contactId === contactId
            ? { ...item, contactIsFavorite: isFavorite }
            : item,
        ),
      );
      setNeedsAttentionConversations((current) =>
        current.map((item) =>
          item.contactId === contactId
            ? { ...item, contactIsFavorite: isFavorite }
            : item,
        ),
      );

      if (favoritesOnly && isFavorite) {
        fetchConversations(0, false, true);
      }

      void refreshConversation(true);
    },
    [
      conversations,
      favoritesOnly,
      fetchConversations,
      refreshConversation,
      selectConversation,
      selectedConversationId,
    ],
  );

  useEffect(() => {
    if (!usesClientBootstrap) {
      return;
    }

    if (favoritesOnly) {
      setHasBusiness(true);
      return;
    }

    let cancelled = false;

    void fetchChatsMonitorInitialAction().then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.success) {
        setIsInitialLoading(false);
        return;
      }

      const data = result.data;
      setHasBusiness(data.hasBusiness);
      setChannels(data.channels);
      setConversations(data.conversations);
      setNeedsAttentionConversations(data.needsAttentionConversations);
      setTotalCount(data.conversationsTotalCount);
      setHasMore(data.conversationsHasMore);
      setIsInitialLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [favoritesOnly, usesClientBootstrap]);

  const hasActiveListFilters =
    Boolean(debouncedSearch) ||
    activeFilter !== "all" ||
    activeQuickView !== "all";

  useInboxListRealtime({
    enabled: hasBusiness && !isInitialLoading,
    selectedConversationId,
    hasActiveFilters: hasActiveListFilters,
    onConnectionChange: setRealtimeConnected,
    onConversationsChange: setConversations,
    onNeedsAttentionChange: setNeedsAttentionConversations,
    onRefresh: () => fetchConversations(0, false, true),
  });

  useInboxListPolling(
    () => {
      if (!isInitialLoading) {
        fetchConversations(0, false, true);
      }
    },
    {
      enabled: hasBusiness && !isInitialLoading,
      intervalMs: realtimeConnected
        ? INBOX_LIST_POLL_INTERVAL_MS
        : INBOX_LIST_POLL_FALLBACK_INTERVAL_MS,
    },
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    if (!isInitialLoading) {
      fetchConversations(0, false);
    }
  }, [fetchConversations, isInitialLoading]);

  useEffect(() => {
    if (usesClientBootstrap) {
      return;
    }

    setHasBusiness(initialHasBusiness ?? true);
    setChannels(initialChannels ?? []);
    setConversations(initialConversations ?? []);
    setNeedsAttentionConversations(initialNeedsAttention ?? []);
    setTotalCount(initialTotalCount ?? 0);
    setHasMore(initialHasMore ?? false);
  }, [
    initialChannels,
    initialConversations,
    initialHasBusiness,
    initialHasMore,
    initialNeedsAttention,
    initialTotalCount,
    usesClientBootstrap,
  ]);

  useInboxChromeRegistration(
    hasBusiness && !isInitialLoading
      ? {
          searchQuery,
          onSearchChange: setSearchQuery,
          activeFilter,
          onFilterChange: setActiveFilter,
          aiChannel,
          aiEnabled: activeAiEnabled,
        }
      : null,
  );

  if (!isInitialLoading && !hasBusiness) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="mx-auto max-w-2xl shadow-none">
          <CardHeader>
            <CardTitle>{CHAT_MESSAGES.noBusinessTitle}</CardTitle>
            <CardDescription>{CHAT_MESSAGES.noBusinessDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.settings}>Go to business settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <InboxShell
      showChatOnMobile={showChatOnMobile}
      channelTabs={
        <InboxChannelTabs
          activeChannel={favoritesOnly ? "favorites" : "all"}
          unreadByChannel={unreadByChannel}
          visibleChannelIds={visibleChannelIds}
        />
      }
      listColumn={
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isInitialLoading ? (
              <ConversationListSkeleton rows={8} />
            ) : (
              <>
                {showNeedsAttentionSection ? (
                  <div className="border-b bg-amber-500/5">
                    <div className="px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                      {CHAT_MESSAGES.needsAttentionTitle}
                    </div>
                    <ChatList
                      conversations={needsAttentionConversations}
                      activeConversationId={activeConversationId}
                      channelId="whatsapp"
                      linkToConversationChannel
                      linkMode="overview"
                      onConversationSelect={handleConversationSelect}
                      variant="inbox"
                    />
                  </div>
                ) : null}

                <ChatList
                  conversations={mainConversations}
                  activeConversationId={activeConversationId}
                  channelId="whatsapp"
                  linkToConversationChannel
                  linkMode={favoritesOnly ? "favorites" : "overview"}
                  onConversationSelect={handleConversationSelect}
                  variant="inbox"
                  emptyVariant={
                    favoritesOnly
                      ? "favorites"
                      : totalCount > 0 && conversations.length === 0
                        ? "search"
                        : "default"
                  }
                />
              </>
            )}
          </div>

          {!isInitialLoading && hasMore ? (
            <div className="shrink-0 border-t p-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={isFetching}
                onClick={() => fetchConversations(conversations.length, true)}
              >
                {isFetching ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : null}
                {CHAT_MESSAGES.loadMoreConversationsShort}
              </Button>
            </div>
          ) : null}
        </>
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
            aiEnabled={activeAiEnabled}
            channelConnected={activeChannelConnected}
            channel={activeConversation?.channel ?? selectedListItem?.channel ?? "whatsapp"}
            cannedResponses={activeCannedResponses}
            isLoadingConversation={isLoadingConversation}
            hasOlderMessages={activeConversation?.hasOlderMessages ?? false}
            isLoadingOlderMessages={isLoadingOlderMessages}
            onLoadOlderMessages={() => {
              void loadOlderMessages();
            }}
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
            onOptimisticMessage={appendMessage}
            onMessageSent={(message, pendingId) => {
              if (pendingId) {
                reconcileMessage(pendingId, message);
                return;
              }

              appendMessage(message);
            }}
            onSendFailed={removeMessage}
            onMessageRemoved={removeMessage}
            onContactDeleted={() => {
              handleConversationSelect(null);
              fetchConversations(0, false, true);
            }}
            onContactFavoriteChange={handleContactFavoriteChange}
          />
        </div>
      }
      detailsColumn={
        <InboxDetailsPanel
          conversation={activeConversation}
          cannedResponses={activeCannedResponses}
          onUseSuggestedReply={setDraft}
          onGenerateReply={() => setSuggestReplyOpen(true)}
        />
      }
    />
  );
}
