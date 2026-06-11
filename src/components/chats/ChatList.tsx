"use client";

import Link from "next/link";

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
import { formatRelativeTime } from "@/utils/dashboard";
import { getLeadScoreBadgeClassName } from "@/utils/lead-score";
import { HIGH_INTENT_LEAD_SCORE } from "@/features/chats/constants";

type ChatListProps = {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  channelId: ChatChannelId;
  hideChannelBadge?: boolean;
  linkToConversationChannel?: boolean;
  linkMode?: "channel" | "overview" | "favorites";
  onConversationSelect?: (conversationId: string) => void;
  variant?: "default" | "inbox";
  emptyVariant?: "default" | "search" | "favorites";
  className?: string;
};

function buildConversationHref(
  channelId: ChatChannelId,
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
  return `${DASHBOARD_ROUTES.chats}/${channel}?conversation=${conversationId}`;
}

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
}: ChatListProps) {
  const isInboxVariant = variant === "inbox";
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

  return (
    <div className={cn("divide-y", className)}>
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        const needsAttention = isConversationNeedsAttention(conversation);
        const isUnread =
          conversation.unreadMessageCount > 0 || conversation.isUnread;
        const unreadCount = conversation.unreadMessageCount;

        const rowClassName = cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
          isActive &&
            (isInboxVariant ? "bg-muted/80" : "bg-primary/5"),
          isInboxVariant &&
            isUnread &&
            !isActive &&
            "border-l-[3px] border-l-primary bg-primary/5",
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
                  {formatRelativeTime(
                    conversation.lastMessageAt ?? conversation.updatedAt,
                  )}
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
              key={conversation.id}
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
            key={conversation.id}
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
      })}
    </div>
  );
}
