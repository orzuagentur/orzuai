"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import { useChannelAiEnabled } from "@/hooks/use-channel-ai-enabled";
import {
  useInboxPanel,
  useDebouncedInboxSearch,
  useSkipInitialListFetch,
} from "@/hooks/use-inbox-panel";
import { AiSuggestReplyPanel } from "@/components/chats/AiSuggestReplyPanel";
import {
  getCachedConversationList,
  setCachedConversationList,
} from "@/lib/client-cache/inbox-messenger-cache";
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
import { CHAT_MESSAGES, type ChatChannelId } from "@/features/chats";
import { INBOX_PAGE_SIZE, type ChatInboxFilter } from "@/features/chats/constants";
import type {
  ChatMonitorChannelStats,
  ChatsChannelPageData,
  ChatsMonitorPageData,
  ConversationListItem,
} from "@/types/chat.types";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { MessagingChannel } from "@/types/database.types";
import {
  countUnreadByChannel,
} from "@/utils/conversation-unread";

type ChatsChannelPanelProps = {
  channelId: ChatChannelId;
} & Partial<
  ChatsChannelPageData &
    Pick<
      ChatsMonitorPageData,
      | "activeChannelConnected"
      | "activeAiEnabled"
      | "activeCannedResponses"
    > & {
      channelStats?: ChatMonitorChannelStats[];
      visibleChannelIds?: MessagingChannel[];
    }
>;

export function ChatsChannelPanel(props: ChatsChannelPanelProps) {
  return (
    <InboxLayoutProvider>
      <ChatsChannelPanelContent {...props} />
    </InboxLayoutProvider>
  );
}

function ChatsChannelPanelContent({
  channelId,
  hasBusiness: initialHasBusiness,
  businessId: initialBusinessId = null,
  channel: initialChannel,
  channelStats: initialChannelStats,
  visibleChannelIds: initialVisibleChannelIds,
  channelConnected: initialChannelConnected,
  aiEnabled: initialAiEnabled,
  conversations: initialConversations,
  cannedResponses: initialCannedResponses,
  activeConversation: initialActiveConversation = null,
  activeChannelConnected: initialActiveChannelConnected,
  activeAiEnabled: initialActiveAiEnabled,
  activeCannedResponses: initialActiveCannedResponses,
}: ChatsChannelPanelProps) {
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation")?.trim() || null;
  const cachedList = getCachedConversationList({
    scope: "channel",
    channel: channelId,
  });

  const [hasBusiness, setHasBusiness] = useState(initialHasBusiness ?? true);
  const [businessId, setBusinessId] = useState<string | null>(initialBusinessId);
  const [channel, setChannel] = useState<MessagingChannel>(
    initialChannel ?? channelId,
  );
  const [visibleChannelIds, setVisibleChannelIds] = useState<MessagingChannel[]>(
    () =>
      initialVisibleChannelIds ??
      initialChannelStats?.map((item) => item.channel) ??
      [],
  );
  const [channelConnected, setChannelConnected] = useState(
    initialChannelConnected ?? false,
  );
  const [channelAiEnabled, setChannelAiEnabled] = useState<boolean | null>(
    initialAiEnabled ?? null,
  );
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    () =>
      Array.isArray(initialConversations) && initialConversations.length > 0
        ? initialConversations
        : (cachedList?.items ?? initialConversations ?? []),
  );
  const [bootstrapCannedResponses, setBootstrapCannedResponses] = useState<
    CannedResponseItem[]
  >(initialCannedResponses ?? []);
  const { searchQuery, setSearchQuery, debouncedSearch } =
    useDebouncedInboxSearch();
  const [activeFilter, setActiveFilter] = useState<ChatInboxFilter>("all");
  const [, startFetching] = useTransition();
  const { consumeSkipInitialFetch } = useSkipInitialListFetch();
  const refreshConversationsRef = useRef<() => void>(() => {});
  const preserveListReadStateRef = useRef<
    (items: ConversationListItem[]) => ConversationListItem[]
  >((items) => items);

  const fetchConversations = useCallback(
    (silent = false) => {
      const run = async () => {
        const result = await fetchMonitorConversationsAction({
          channel: channelId,
          offset: 0,
          limit: INBOX_PAGE_SIZE,
          search: debouncedSearch || undefined,
          view: "all",
          filter: activeFilter,
          sort: "latest",
        });

        if (result.success) {
          setConversations(
            preserveListReadStateRef.current(result.data.items),
          );
        }
      };

      if (silent) {
        void run();
        return;
      }

      startFetching(run);
    },
    [activeFilter, channelId, debouncedSearch],
  );

  const refreshConversations = useCallback(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  refreshConversationsRef.current = refreshConversations;

  const hasActiveListFilters =
    Boolean(debouncedSearch) || activeFilter !== "all";

  const {
    selectedConversationId,
    conversation: activeConversation,
    channelConnected: activeChannelConnected,
    aiEnabled,
    setAiEnabled,
    cannedResponses,
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
    preserveListReadState,
    refreshCannedResponses,
  } = useInboxPanel({
    initialConversationId,
    initialActiveConversation,
    initialChannelConnected: initialActiveChannelConnected ?? channelConnected,
    initialAiEnabled: initialActiveAiEnabled ?? channelAiEnabled,
    initialCannedResponses: initialActiveCannedResponses ?? bootstrapCannedResponses,
    hasBusiness,
    businessId,
    isInitialLoading: false,
    channelFilter: channelId,
    hasActiveListFilters,
    onConversationsChange: setConversations,
    onRefreshConversations: () => refreshConversationsRef.current(),
  });

  useEffect(() => {
    preserveListReadStateRef.current = preserveListReadState;
  }, [preserveListReadState]);

  const syncedChannelAiEnabled = useChannelAiEnabled(channel, channelAiEnabled);
  const syncedConversationAiEnabled = useChannelAiEnabled(
    activeConversation?.channel ?? channel,
    aiEnabled ?? channelAiEnabled,
  );

  const { detailsOpen } = useInboxLayout();

  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    setCachedConversationList(
      { scope: "channel", channel: channelId },
      { items: conversations },
    );
  }, [channelId, conversations]);

  useEffect(() => {
    setHasBusiness(initialHasBusiness ?? true);
    setBusinessId(initialBusinessId);
    setChannel(initialChannel ?? channelId);
    setVisibleChannelIds(
      initialVisibleChannelIds ??
        initialChannelStats?.map((item) => item.channel) ??
        [],
    );
    setChannelConnected(initialChannelConnected ?? false);
    setChannelAiEnabled(initialAiEnabled ?? null);
    setBootstrapCannedResponses(initialCannedResponses ?? []);

    const cachedList = getCachedConversationList({
      scope: "channel",
      channel: channelId,
    });
    const nextConversations =
      Array.isArray(initialConversations) && initialConversations.length > 0
        ? initialConversations
        : (cachedList?.items ?? []);

    setConversations(preserveListReadStateRef.current(nextConversations));
  }, [
    channelId,
    initialAiEnabled,
    initialCannedResponses,
    initialChannel,
    initialChannelConnected,
    initialChannelStats,
    initialVisibleChannelIds,
    initialConversations,
    initialHasBusiness,
    initialBusinessId,
  ]);

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

  useEffect(() => {
    if (consumeSkipInitialFetch()) {
      return;
    }

    fetchConversations();
  }, [consumeSkipInitialFetch, fetchConversations]);

  const selectedListItem = useMemo(() => {
    if (!selectedConversationId) {
      return null;
    }

    return (
      conversations.find((item) => item.id === selectedConversationId) ?? null
    );
  }, [conversations, selectedConversationId]);

  useInboxChromeRegistration(
    hasBusiness
      ? {
          searchQuery,
          onSearchChange: setSearchQuery,
          activeFilter,
          onFilterChange: setActiveFilter,
          aiChannel: channel,
          aiEnabled: syncedChannelAiEnabled,
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

  const activeConversationId = selectedConversationId;
  const showChatOnMobile = Boolean(activeConversationId);
  const resolvedChannelConnected = activeConversation
    ? activeChannelConnected || channelConnected
    : channelConnected;

  return (
    <InboxShell
      showChatOnMobile={showChatOnMobile}
      showRightColumn={detailsOpen || suggestReplyOpen}
      channelTabs={
        <InboxChannelTabs
          activeChannel={channelId}
          unreadByChannel={unreadByChannel}
          visibleChannelIds={visibleChannelIds}
        />
      }
      listColumn={
        <div className="min-h-0 flex-1">
          <ChatList
            className="h-full"
            conversations={conversations}
            activeConversationId={activeConversationId}
            channelId={channelId}
            hideChannelBadge
            onConversationSelect={handleConversationSelect}
            variant="inbox"
            emptyVariant={
              hasActiveListFilters && conversations.length === 0
                ? "search"
                : "default"
            }
          />
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
            aiEnabled={syncedConversationAiEnabled}
            onAiEnabledChange={(enabled) => {
              setAiEnabled(enabled);
              setChannelAiEnabled(enabled);
            }}
            channelConnected={resolvedChannelConnected}
            channel={channel}
            cannedResponses={cannedResponses}
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
              void refreshConversations();
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
