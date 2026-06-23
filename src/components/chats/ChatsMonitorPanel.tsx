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
import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxDetailsPanel } from "@/components/chats/inbox/InboxDetailsPanel";
import { useInboxChromeRegistration } from "@/components/chats/inbox/inbox-chrome-context";
import { InboxShell } from "@/components/chats/inbox/InboxShell";
import { useInboxLayout, InboxLayoutProvider } from "@/components/chats/inbox/inbox-layout-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import type { ListConversationsMonitorResult } from "@/services/chat-inbox-query.service";
import { CHAT_MESSAGES } from "@/features/chats";
import { useInboxPanel, useDebouncedInboxSearch, useSkipInitialListFetch } from "@/hooks/use-inbox-panel";
import { useChannelAiEnabled } from "@/hooks/use-channel-ai-enabled";
import { AiSuggestReplyPanel } from "@/components/chats/AiSuggestReplyPanel";
import {
  getCachedConversationList,
  setCachedConversationList,
} from "@/lib/client-cache/inbox-messenger-cache";
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
} from "@/utils/conversation-unread";

type ChatsMonitorPanelProps = Partial<ChatsMonitorPageData> & {
  favoritesOnly?: boolean;
};

export function ChatsMonitorPanel(props: ChatsMonitorPanelProps = {}) {
  return (
    <InboxLayoutProvider>
      <ChatsMonitorPanelContent {...props} />
    </InboxLayoutProvider>
  );
}

function ChatsMonitorPanelContent({
  hasBusiness: initialHasBusiness,
  businessId: initialBusinessId = null,
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
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation")?.trim() || null;
  const listScope = favoritesOnly ? ("favorites" as const) : ("monitor" as const);
  const cachedList = getCachedConversationList({ scope: listScope });

  const [hasBusiness, setHasBusiness] = useState(initialHasBusiness ?? true);
  const [businessId, setBusinessId] = useState<string | null>(initialBusinessId);
  const [channelStats, setChannels] = useState<ChatMonitorChannelStats[]>(
    initialChannels ?? [],
  );
  const visibleChannelIds = useMemo(
    () => channelStats.map((item) => item.channel),
    [channelStats],
  );
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    () =>
      Array.isArray(initialConversations) && initialConversations.length > 0
        ? initialConversations
        : (cachedList?.items ?? initialConversations ?? []),
  );
  const [needsAttentionConversations, setNeedsAttentionConversations] =
    useState<ConversationListItem[]>(initialNeedsAttention ?? []);
  const [totalCount, setTotalCount] = useState(
    initialTotalCount ?? cachedList?.totalCount ?? 0,
  );
  const [hasMore, setHasMore] = useState(
    initialHasMore ?? cachedList?.hasMore ?? false,
  );
  const { searchQuery, setSearchQuery, debouncedSearch } =
    useDebouncedInboxSearch();
  const [activeFilter, setActiveFilter] = useState<ChatInboxFilter>("all");
  const [activeSort] = useState<ChatInboxSort>("latest");
  const [activeQuickView] = useState<ChatInboxQuickView>(
    favoritesOnly ? "favorites" : "all",
  );
  const [isFetching, startFetching] = useTransition();
  const { consumeSkipInitialFetch } = useSkipInitialListFetch();
  const refreshConversationsRef = useRef<() => void>(() => {});
  const preserveListReadStateRef = useRef<
    (items: ConversationListItem[]) => ConversationListItem[]
  >((items) => items);

  const fetchConversations = useCallback(
    (
      offset: number,
      append: boolean,
      silent = false,
      limitOverride?: number,
    ) => {
      const run = async () => {
        const result = await fetchMonitorConversationsAction({
          offset,
          limit: limitOverride ?? INBOX_PAGE_SIZE,
          search: debouncedSearch || undefined,
          view: activeQuickView,
          filter: activeFilter,
          sort: activeSort,
          includeNeedsAttention:
            offset === 0 && activeQuickView === "all" && !debouncedSearch,
        });

        if (!result.success) {
          return;
        }

        const nextItems = preserveListReadStateRef.current(result.data.items);

        setConversations((current) =>
          append ? [...current, ...nextItems] : nextItems,
        );
        setTotalCount(result.data.totalCount);
        setHasMore(result.data.hasMore);

        const needsAttention = (
          result.data as ListConversationsMonitorResult
        ).needsAttentionConversations;

        if (needsAttention) {
          setNeedsAttentionConversations(
            preserveListReadStateRef.current(needsAttention),
          );
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

  const refreshConversations = useCallback(() => {
    const loadedLimit = Math.max(conversations.length, INBOX_PAGE_SIZE);
    fetchConversations(0, false, true, loadedLimit);
  }, [conversations.length, fetchConversations]);

  refreshConversationsRef.current = refreshConversations;

  const hasActiveListFilters =
    Boolean(debouncedSearch) ||
    activeFilter !== "all" ||
    activeQuickView !== "all";

  const {
    selectedConversationId,
    conversation: activeConversation,
    channelConnected: activeChannelConnected,
    aiEnabled: activeAiEnabled,
    setAiEnabled: setActiveAiEnabled,
    cannedResponses: activeCannedResponses,
    isLoadingConversation,
    isLoadingOlderMessages,
    loadOlderMessages,
    appendMessage,
    removeMessage,
    reconcileMessage,
    updateMessage,
    isClientTyping,
    isReplyTyping,
    autoReplyError,
    dismissAutoReplyError,
    refreshConversation,
    draft,
    setDraft,
    suggestReplyOpen,
    setSuggestReplyOpen,
    handleConversationSelect,
    handleConversationViewed,
    handleReadProgress,
    selectConversation,
    preserveListReadState,
    refreshCannedResponses,
  } = useInboxPanel({
    initialConversationId,
    initialActiveConversation,
    initialChannelConnected: initialActiveChannelConnected ?? false,
    initialAiEnabled: initialActiveAiEnabled ?? null,
    initialCannedResponses: initialActiveCannedResponses ?? [],
    hasBusiness,
    businessId,
    isInitialLoading: false,
    hasActiveListFilters,
    onConversationsChange: setConversations,
    onNeedsAttentionChange: setNeedsAttentionConversations,
    onRefreshConversations: () => refreshConversationsRef.current(),
  });

  useEffect(() => {
    preserveListReadStateRef.current = preserveListReadState;
  }, [preserveListReadState]);

  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    setCachedConversationList(
      { scope: listScope },
      {
        items: conversations,
        totalCount,
        hasMore,
      },
    );
  }, [conversations, hasMore, listScope, totalCount]);

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

  const activeConversationId = selectedConversationId;
  const showChatOnMobile = Boolean(activeConversationId);
  const { detailsOpen } = useInboxLayout();
  const chatAiChannel =
    activeConversation?.channel ?? selectedListItem?.channel ?? "whatsapp";
  const channelStatsConnected = useMemo(() => {
    const channel = activeConversation?.channel ?? selectedListItem?.channel;

    if (!channel) {
      return false;
    }

    return channelStats.find((item) => item.channel === channel)?.connected ?? false;
  }, [activeConversation?.channel, channelStats, selectedListItem?.channel]);
  const resolvedChannelConnected =
    activeChannelConnected || channelStatsConnected;
  const syncedActiveAiEnabled = useChannelAiEnabled(
    chatAiChannel,
    activeAiEnabled,
  );
  const aiChannel = activeConversation?.channel ?? null;

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
    if (consumeSkipInitialFetch()) {
      return;
    }

    fetchConversations(0, false);
  }, [consumeSkipInitialFetch, fetchConversations]);

  useEffect(() => {
    setHasBusiness(initialHasBusiness ?? true);
    setBusinessId(initialBusinessId);
    setChannels(initialChannels ?? []);
    setConversations(initialConversations ?? []);
    setNeedsAttentionConversations(initialNeedsAttention ?? []);
    setTotalCount(initialTotalCount ?? 0);
    setHasMore(initialHasMore ?? false);
  }, [
    initialChannels,
    initialConversations,
    initialHasBusiness,
    initialBusinessId,
    initialHasMore,
    initialNeedsAttention,
    initialTotalCount,
  ]);

  useInboxChromeRegistration(
    hasBusiness
      ? {
          searchQuery,
          onSearchChange: setSearchQuery,
          activeFilter,
          onFilterChange: setActiveFilter,
          aiChannel,
          aiEnabled: syncedActiveAiEnabled,
        }
      : null,
  );

  if (!hasBusiness) {
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
      showRightColumn={detailsOpen || suggestReplyOpen}
      channelTabs={
        <InboxChannelTabs
          activeChannel={favoritesOnly ? "favorites" : "all"}
          unreadByChannel={unreadByChannel}
          visibleChannelIds={visibleChannelIds}
        />
      }
      listColumn={
        <div className="flex min-h-0 flex-1 flex-col">
          {showNeedsAttentionSection ? (
            <div className="shrink-0 border-b bg-amber-500/5">
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
            className="min-h-0 flex-1"
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

          {hasMore ? (
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
            isReplyTyping={isReplyTyping}
            autoReplyError={autoReplyError}
            onDismissAutoReplyError={dismissAutoReplyError}
            aiEnabled={syncedActiveAiEnabled}
            onAiEnabledChange={setActiveAiEnabled}
            channelConnected={resolvedChannelConnected}
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
            onMessageUpdated={updateMessage}
            onContactDeleted={() => {
              handleConversationSelect(null);
              fetchConversations(0, false, true);
            }}
            onContactFavoriteChange={handleContactFavoriteChange}
            onConversationViewed={handleConversationViewed}
            onReadProgress={handleReadProgress}
            onQuickRepliesOpen={() => {
              void refreshCannedResponses(activeConversation?.channel ?? null);
            }}
          />
        </div>
      }
      detailsColumn={
        suggestReplyOpen && activeConversation ? (
          <AiSuggestReplyPanel
            conversationId={activeConversation.id}
            open
            onOpenChange={setSuggestReplyOpen}
            onUseSuggestion={setDraft}
          />
        ) : (
          <InboxDetailsPanel conversation={activeConversation} />
        )
      }
    />
  );
}
