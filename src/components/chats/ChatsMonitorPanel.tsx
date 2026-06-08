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
import { AlertCircleIcon, ArrowLeftIcon, BotIcon, Loader2Icon, MessageSquareIcon } from "lucide-react";

import { ChatInboxToolbar } from "@/components/chats/ChatInboxToolbar";
import { ChatList } from "@/components/chats/ChatList";
import { ChatWindow } from "@/components/chats/ChatWindow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { fetchMonitorConversationsAction } from "@/features/chats/actions/fetch-monitor-conversations";
import { CHAT_CHANNEL_LIST, CHAT_MESSAGES } from "@/features/chats";
import type {
  ChatInboxFilter,
  ChatInboxQuickView,
  ChatInboxSort,
} from "@/features/chats/constants";
import { INBOX_PAGE_SIZE } from "@/features/chats/constants";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { cn } from "@/lib/utils";
import type { ChatsMonitorPageData, ConversationListItem } from "@/types/chat.types";

type ChatsMonitorPanelProps = ChatsMonitorPageData;

export function ChatsMonitorPanel({
  hasBusiness,
  channels,
  totalConversations,
  totalMessages,
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
  const [activeSort, setActiveSort] = useState<ChatInboxSort>("latest");
  const [activeQuickView, setActiveQuickView] =
    useState<ChatInboxQuickView>("all");
  const [conversations, setConversations] =
    useState<ConversationListItem[]>(initialConversations);
  const [needsAttentionConversations, setNeedsAttentionConversations] =
    useState(initialNeedsAttention);
  const [totalCount, setTotalCount] = useState(conversationsTotalCount);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isFetching, startFetching] = useTransition();
  const skipInitialFetchRef = useRef(true);

  const statsByChannel = useMemo(
    () => new Map(channels.map((item) => [item.channel, item])),
    [channels],
  );

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
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6 lg:flex-row lg:gap-0 lg:p-0">
      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card lg:rounded-none lg:border-0 lg:border-r",
          showChatOnMobile && "hidden lg:flex",
        )}
      >
        <div className="shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{CHAT_MESSAGES.unifiedInboxTitle}</p>
              <p className="text-xs text-muted-foreground">
                {CHAT_MESSAGES.monitorConversationsSummary(
                  conversations.length,
                  totalCount || totalConversations,
                )}
              </p>
            </div>
            {isFetching ? (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>

        <ChatInboxToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          activeSort={activeSort}
          onSortChange={setActiveSort}
          activeQuickView={activeQuickView}
          onQuickViewChange={setActiveQuickView}
          className="shrink-0"
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {showNeedsAttentionSection ? (
            <div className="border-b bg-amber-500/5">
              <div className="flex items-center gap-2 px-4 py-3">
                <AlertCircleIcon className="size-4 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {CHAT_MESSAGES.needsAttentionTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CHAT_MESSAGES.needsAttentionDescription}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  {needsAttentionConversations.length}
                </Badge>
              </div>
              <ChatList
                conversations={needsAttentionConversations}
                activeConversationId={activeConversationId}
                channelId="whatsapp"
                linkToConversationChannel
                linkMode="overview"
              />
            </div>
          ) : null}

          <ChatList
            conversations={mainConversations}
            activeConversationId={activeConversationId}
            channelId="whatsapp"
            linkToConversationChannel
            linkMode="overview"
            emptyVariant={
              totalConversations > 0 && conversations.length === 0
                ? "search"
                : "default"
            }
          />
        </div>

        {hasMore ? (
          <div className="shrink-0 border-t p-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isFetching}
              onClick={() => fetchConversations(conversations.length, true)}
            >
              {CHAT_MESSAGES.loadMoreConversations}
            </Button>
          </div>
        ) : null}

        <div className="shrink-0 space-y-3 border-t p-4 lg:hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquareIcon className="size-4 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{totalConversations}</span>
            </div>
            <div className="flex items-center gap-2">
              <BotIcon className="size-4 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{totalMessages}</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col lg:min-w-0 lg:flex-[1.4]",
          showChatOnMobile ? "flex" : "hidden lg:flex",
        )}
      >
        {showChatOnMobile ? (
          <div className="border-b px-3 py-2 lg:hidden">
            <Button variant="ghost" size="sm" asChild>
              <Link href={DASHBOARD_ROUTES.chats}>
                <ArrowLeftIcon className="size-4" />
                {CHAT_MESSAGES.monitorTitle}
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
        />
      </section>

      <div className="shrink-0 space-y-4 lg:hidden">
        <section className="rounded-lg border bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquareIcon className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {CHAT_MESSAGES.monitorKpiConversations}
              </span>
              <span className="font-semibold tabular-nums">{totalConversations}</span>
            </div>
            <div className="flex items-center gap-2">
              <BotIcon className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {CHAT_MESSAGES.monitorKpiMessages}
              </span>
              <span className="font-semibold tabular-nums">{totalMessages}</span>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {CHAT_MESSAGES.monitorChannelsLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {CHAT_CHANNEL_LIST.map((channel) => {
              const stats = statsByChannel.get(channel.id);
              const connected = stats?.connected ?? false;

              return (
                <Link
                  key={channel.id}
                  href={`${DASHBOARD_ROUTES.chats}/${channel.id}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                    !connected && "opacity-80",
                  )}
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md ${getChannelIconContainerClassName(channel.id)}`}
                  >
                    <channel.icon className="size-4" />
                  </div>
                  <span className="font-medium">{channel.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {stats?.conversationsCount ?? 0}
                  </span>
                  <Badge
                    variant={connected ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {connected ? "Live" : "Offline"}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="hidden w-72 shrink-0 flex-col gap-4 border-l p-4 xl:flex">
        <section className="rounded-lg border bg-muted/20 px-4 py-3">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquareIcon className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {CHAT_MESSAGES.monitorKpiConversations}
              </span>
              <span className="ml-auto font-semibold tabular-nums">
                {totalConversations}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BotIcon className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {CHAT_MESSAGES.monitorKpiMessages}
              </span>
              <span className="ml-auto font-semibold tabular-nums">
                {totalMessages}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {CHAT_MESSAGES.monitorChannelsLabel}
          </p>
          <div className="space-y-2">
            {CHAT_CHANNEL_LIST.map((channel) => {
              const stats = statsByChannel.get(channel.id);
              const connected = stats?.connected ?? false;

              return (
                <Link
                  key={channel.id}
                  href={`${DASHBOARD_ROUTES.chats}/${channel.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                    !connected && "opacity-80",
                  )}
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md ${getChannelIconContainerClassName(channel.id)}`}
                  >
                    <channel.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{channel.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats?.conversationsCount ?? 0}{" "}
                      {CHAT_MESSAGES.conversationsCount}
                    </p>
                  </div>
                  <Badge
                    variant={connected ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {connected ? "Live" : "Offline"}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
  );
}
