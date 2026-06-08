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
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";

import { ChatList } from "@/components/chats/ChatList";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { InboxChannelTabs } from "@/components/chats/inbox/InboxChannelTabs";
import { InboxDetailsPanel } from "@/components/chats/inbox/InboxDetailsPanel";
import { InboxHeader } from "@/components/chats/inbox/InboxHeader";
import { InboxShell } from "@/components/chats/inbox/InboxShell";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import { CHAT_MESSAGES } from "@/features/chats";
import type {
  ChatInboxFilter,
  ChatInboxQuickView,
  ChatInboxSort,
} from "@/features/chats/constants";
import { INBOX_PAGE_SIZE } from "@/features/chats/constants";
import type { ChatsMonitorPageData, ConversationListItem } from "@/types/chat.types";

type ChatsMonitorPanelProps = ChatsMonitorPageData;

export function ChatsMonitorPanel({
  hasBusiness,
  channels,
  conversations: initialConversations,
  conversationsTotalCount,
  conversationsHasMore: initialHasMore,
  needsAttentionConversations: initialNeedsAttention,
  activeConversation,
  activeChannelConnected,
  activeAiEnabled,
  activeCannedResponses,
}: ChatsMonitorPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatInboxFilter>("all");
  const [activeSort] = useState<ChatInboxSort>("latest");
  const [activeQuickView] = useState<ChatInboxQuickView>("all");
  const [conversations, setConversations] =
    useState<ConversationListItem[]>(initialConversations);
  const [needsAttentionConversations, setNeedsAttentionConversations] =
    useState(initialNeedsAttention);
  const [totalCount, setTotalCount] = useState(conversationsTotalCount);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isFetching, startFetching] = useTransition();
  const [draft, setDraft] = useState("");
  const skipInitialFetchRef = useRef(true);

  const needsAttentionIds = useMemo(
    () => new Set(needsAttentionConversations.map((item) => item.id)),
    [needsAttentionConversations],
  );

  const showNeedsAttentionSection =
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

  const activeConversationId = activeConversation?.id ?? null;
  const showChatOnMobile = Boolean(activeConversationId);
  const aiChannel = activeConversation?.channel ?? null;

  const fetchConversations = useCallback(
    (offset: number, append: boolean) => {
      startFetching(async () => {
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
      });
    },
    [activeFilter, activeQuickView, activeSort, debouncedSearch],
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

    fetchConversations(0, false);
  }, [fetchConversations]);

  useEffect(() => {
    setConversations(initialConversations);
    setNeedsAttentionConversations(initialNeedsAttention);
    setTotalCount(conversationsTotalCount);
    setHasMore(initialHasMore);
  }, [
    conversationsTotalCount,
    initialConversations,
    initialHasMore,
    initialNeedsAttention,
  ]);

  if (!hasBusiness) {
    return null;
  }

  return (
    <InboxShell
      showChatOnMobile={showChatOnMobile}
      header={
        <InboxHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          aiChannel={aiChannel}
          aiEnabled={activeAiEnabled}
        />
      }
      listColumn={
        <>
          <InboxChannelTabs activeChannel="all" channelStats={channels} />

          <div className="min-h-0 flex-1 overflow-y-auto">
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
                  variant="inbox"
                />
              </div>
            ) : null}

            <ChatList
              conversations={mainConversations}
              activeConversationId={activeConversationId}
              channelId="whatsapp"
              linkToConversationChannel
              linkMode="overview"
              variant="inbox"
              emptyVariant={
                totalCount > 0 && conversations.length === 0 ? "search" : "default"
              }
            />
          </div>

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
        </>
      }
      chatColumn={
        <>
          {showChatOnMobile ? (
            <div className="border-b px-3 py-2 lg:hidden">
              <Button variant="ghost" size="sm" asChild>
                <Link href={DASHBOARD_ROUTES.chats}>
                  <ArrowLeftIcon className="size-4" />
                  {CHAT_MESSAGES.pageTitle}
                </Link>
              </Button>
            </div>
          ) : null}

          <ChatWindow
            conversation={activeConversation}
            aiEnabled={activeAiEnabled}
            channelConnected={activeChannelConnected}
            channel={activeConversation?.channel ?? "whatsapp"}
            cannedResponses={activeCannedResponses}
            layout="inbox"
            draft={draft}
            onDraftChange={setDraft}
          />
        </>
      }
      detailsColumn={
        <InboxDetailsPanel
          conversation={activeConversation}
          cannedResponses={activeCannedResponses}
          onUseSuggestedReply={setDraft}
        />
      }
    />
  );
}
