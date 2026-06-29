"use client";

import Link from "next/link";
import { memo, useRef, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import {
  getConversationStatusClassName,
  getConversationStatusLabel,
} from "@/utils/conversation-status";
import { isConversationNeedsAttention } from "@/utils/chat-inbox-priority";
import type { ChatChannelId } from "@/features/chats";
import type { ConversationListItem } from "@/types/chat.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { RelativeTime } from "@/components/ui/relative-time";
import { getLeadScoreBadgeClassName } from "@/utils/lead-score";
import { HIGH_INTENT_LEAD_SCORE } from "@/features/chats/constants";

const CHAT_LIST_ROW_ESTIMATE_PX = 80;
const CHAT_LIST_VIRTUALIZE_THRESHOLD = 20;
type ChatListChannelId = ChatChannelId | "voice";

type ChatListProps = {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  channelId: ChatListChannelId;
  hideChannelBadge?: boolean;
  linkToConversationChannel?: boolean;
  linkMode?: "channel" | "overview" | "favorites";
  onConversationSelect?: (conversationId: string) => void;
  variant?: "default" | "inbox";
  emptyVariant?: "default" | "search" | "favorites";
  className?: string;
  /** When set, virtualizes against this parent scroll container instead of owning scroll. */
  scrollElementRef?: RefObject<HTMLElement | null>;
};

function buildConversationHref(
  channelId: ChatListChannelId,
  conversationId: string,
  conversationChannel: ConversationListItem["channel"],
  linkToConversationChannel: boolean,
  linkMode: "channel" | "overview" | "favorites",
): string {
  if (linkMode === "favorites") {
    return `${DASHBOARD_ROUTES.chatsFavorites}?conversation=${conversationId}`;
  }

  if (linkMode === "overview") {
    return `${DASHBOARD_ROUTES.chats}?conversation=${conversationId}`;
  }

  const channel = linkToConversationChannel ? conversationChannel : channelId;
  if (channel === "voice") {
    return `${DASHBOARD_ROUTES.chatsSms}?conversation=${conversationId}`;
  }

  return `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`;
}

type ConversationListRowProps = {
  conversation: ConversationListItem;
  activeConversationId: string | null;
  channelId: ChatListChannelId;
  hideChannelBadge: boolean;
  linkToConversationChannel: boolean;
  linkMode: "channel" | "overview" | "favorites";
  onConversationSelect?: (conversationId: string) => void;
  variant: "default" | "inbox";
};

function ConversationListRow({
  conversation,
  activeConversationId,
  channelId,
  hideChannelBadge,
  linkToConversationChannel,
  linkMode,
  onConversationSelect,
  variant,
}: ConversationListRowProps) {
  const isInboxVariant = variant === "inbox";
  const isActive = conversation.id === activeConversationId;
  const needsAttention = isConversationNeedsAttention(conversation);
  const isUnread =
    !isActive &&
    (conversation.unreadMessageCount > 0 || conversation.isUnread);
  const unreadCount = conversation.unreadMessageCount;

  const rowClassName = cn(
    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
    isActive && (isInboxVariant ? "bg-muted/80" : "bg-primary/5"),
    isInboxVariant &&
      isUnread &&
      !isActive &&
      "border-l-[3px] border-l-muted-foreground/35 bg-muted/40",
    !isInboxVariant &&
      needsAttention &&
      "border-l-2 border-l-amber-500 bg-amber-500/5",
  );

  const rowContent = (
    <>
      <div className="relative shrink-0">
        <ContactAvatar
          name={conversation.contactName}
          avatarUrl={conversation.contactAvatarUrl}
          className="size-11"
          size="lg"
        />
        {isInboxVariant ? (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background",
              getChannelBadgeClassName(conversation.channel),
            )}
          >
            <ChannelBrandIcon
              channel={conversation.channel}
              className="size-3"
            />
          </span>
        ) : isUnread ? (
          <span
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-amber-500"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "truncate",
              isUnread && isInboxVariant ? "font-semibold" : "font-medium",
            )}
          >
            {conversation.contactName}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            <RelativeTime
              value={conversation.lastMessageAt ?? conversation.updatedAt}
            />
          </span>
        </div>
        {conversation.lastMessagePreview ? (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {conversation.lastMessagePreview}
          </p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">
            {formatContactIdentifier(conversation.contactPhone)}
          </p>
        )}
        {!isInboxVariant ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {!hideChannelBadge ? (
              <Badge
                variant="outline"
                className={`shrink-0 gap-1 px-1.5 py-0 text-[10px] ${getChannelBadgeClassName(conversation.channel)}`}
              >
                <ChannelBrandIcon
                  channel={conversation.channel}
                  className="size-3"
                />
                {getChannelBadgeLabel(conversation.channel)}
              </Badge>
            ) : null}
            {isUnread ? (
              <Badge
                variant="outline"
                className="shrink-0 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
              >
                {CHAT_MESSAGES.awaitingReply}
              </Badge>
            ) : null}
            {conversation.leadScore !== null &&
            conversation.leadScore >= HIGH_INTENT_LEAD_SCORE ? (
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${getLeadScoreBadgeClassName(conversation.leadScore)}`}
              >
                {CHAT_MESSAGES.highIntentBadge} · {conversation.leadScore}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
      {isInboxVariant && isUnread ? (
        <span
          className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground"
          aria-label={`${CHAT_MESSAGES.unreadMessage} (${unreadCount})`}
        >
          {unreadCount > 99 ? "99+" : Math.max(unreadCount, 1)}
        </span>
      ) : !isInboxVariant ? (
        <Badge
          variant="outline"
          className={`shrink-0 self-start text-[10px] ${getConversationStatusClassName(conversation.status)}`}
        >
          {getConversationStatusLabel(conversation.status)}
        </Badge>
      ) : null}
    </>
  );

  if (onConversationSelect) {
    return (
      <button
        type="button"
        onClick={() => onConversationSelect(conversation.id)}
        className={rowClassName}
      >
        {rowContent}
      </button>
    );
  }

  return (
    <Link
      href={buildConversationHref(
        channelId,
        conversation.id,
        conversation.channel,
        linkToConversationChannel,
        linkMode,
      )}
      className={rowClassName}
    >
      {rowContent}
    </Link>
  );
}

const MemoConversationListRow = memo(
  ConversationListRow,
  (previous, next) =>
    previous.activeConversationId === next.activeConversationId &&
    previous.channelId === next.channelId &&
    previous.hideChannelBadge === next.hideChannelBadge &&
    previous.linkToConversationChannel === next.linkToConversationChannel &&
    previous.linkMode === next.linkMode &&
    previous.onConversationSelect === next.onConversationSelect &&
    previous.variant === next.variant &&
    previous.conversation.id === next.conversation.id &&
    previous.conversation.updatedAt === next.conversation.updatedAt &&
    previous.conversation.lastMessageAt === next.conversation.lastMessageAt &&
    previous.conversation.lastMessagePreview ===
      next.conversation.lastMessagePreview &&
    previous.conversation.unreadMessageCount ===
      next.conversation.unreadMessageCount &&
    previous.conversation.isUnread === next.conversation.isUnread &&
    previous.conversation.status === next.conversation.status &&
    previous.conversation.contactName === next.conversation.contactName &&
    previous.conversation.contactAvatarUrl ===
      next.conversation.contactAvatarUrl,
);

export function ChatList({
  conversations,
  activeConversationId,
  channelId,
  hideChannelBadge = false,
  linkToConversationChannel = false,
  linkMode = "channel",
  onConversationSelect,
  variant = "default",
  emptyVariant = "default",
  className,
  scrollElementRef,
}: ChatListProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const usesExternalScroll = Boolean(scrollElementRef);
  const shouldVirtualize =
    conversations.length >= CHAT_LIST_VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? conversations.length : 0,
    getScrollElement: () =>
      scrollElementRef?.current ?? internalScrollRef.current,
    estimateSize: () => CHAT_LIST_ROW_ESTIMATE_PX,
    overscan: 8,
    getItemKey: (index) => conversations[index]?.id ?? index,
  });

  if (conversations.length === 0) {
    const isSearchEmpty = emptyVariant === "search";
    const isFavoritesEmpty = emptyVariant === "favorites";

    return (
      <EmptyState
        variant="inbox"
        className={className}
        title={
          isFavoritesEmpty
            ? CHAT_MESSAGES.favoritesEmptyTitle
            : isSearchEmpty
              ? CHAT_MESSAGES.emptySearchTitle
              : CHAT_MESSAGES.emptyListTitle
        }
        description={
          isFavoritesEmpty
            ? CHAT_MESSAGES.favoritesEmptyDescription
            : isSearchEmpty
              ? CHAT_MESSAGES.emptySearchDescription
              : CHAT_MESSAGES.emptyListDescription
        }
        actionLabel={
          isSearchEmpty || isFavoritesEmpty ? undefined : "Open Integrations"
        }
        actionHref={
          isSearchEmpty || isFavoritesEmpty
            ? undefined
            : DASHBOARD_ROUTES.integrations
        }
      />
    );
  }

  const listBody = shouldVirtualize ? (
    <div
      className="relative divide-y"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const conversation = conversations[virtualRow.index];

        if (!conversation) {
          return null;
        }

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            <MemoConversationListRow
              conversation={conversation}
              activeConversationId={activeConversationId}
              channelId={channelId}
              hideChannelBadge={hideChannelBadge}
              linkToConversationChannel={linkToConversationChannel}
              linkMode={linkMode}
              onConversationSelect={onConversationSelect}
              variant={variant}
            />
          </div>
        );
      })}
    </div>
  ) : (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <MemoConversationListRow
          key={conversation.id}
          conversation={conversation}
          activeConversationId={activeConversationId}
          channelId={channelId}
          hideChannelBadge={hideChannelBadge}
          linkToConversationChannel={linkToConversationChannel}
          linkMode={linkMode}
          onConversationSelect={onConversationSelect}
          variant={variant}
        />
      ))}
    </div>
  );

  if (usesExternalScroll) {
    return <div className={className}>{listBody}</div>;
  }

  return (
    <div
      ref={internalScrollRef}
      className={cn("h-full overflow-y-auto", className)}
    >
      {listBody}
    </div>
  );
}
