"use client";

import Link from "next/link";

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
  linkMode?: "channel" | "overview";
  emptyVariant?: "default" | "search";
  className?: string;
};

function buildConversationHref(
  channelId: ChatChannelId,
  conversationId: string,
  conversationChannel: ConversationListItem["channel"],
  linkToConversationChannel: boolean,
  linkMode: "channel" | "overview",
): string {
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
  emptyVariant = "default",
  className,
}: ChatListProps) {
  if (conversations.length === 0) {
    const isSearchEmpty = emptyVariant === "search";

    return (
      <EmptyState
        variant="inbox"
        className={className}
        title={
          isSearchEmpty
            ? CHAT_MESSAGES.emptySearchTitle
            : CHAT_MESSAGES.emptyListTitle
        }
        description={
          isSearchEmpty
            ? CHAT_MESSAGES.emptySearchDescription
            : CHAT_MESSAGES.emptyListDescription
        }
        actionLabel={isSearchEmpty ? undefined : "Open Integrations"}
        actionHref={isSearchEmpty ? undefined : DASHBOARD_ROUTES.integrations}
      />
    );
  }

  return (
    <div className={cn("divide-y", className)}>
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        const needsAttention = isConversationNeedsAttention(conversation);
        const awaitingReply = conversation.lastMessageSenderType === "client";

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
            className={cn(
              "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
              isActive && "bg-primary/5",
              needsAttention && "border-l-2 border-l-amber-500 bg-amber-500/5",
            )}
          >
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {conversation.contactName.slice(0, 2).toUpperCase()}
              {awaitingReply ? (
                <span
                  className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-amber-500"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate font-medium">
                      {conversation.contactName}
                    </p>
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
                    {awaitingReply ? (
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
                  <p className="truncate text-xs text-muted-foreground">
                    {formatContactIdentifier(conversation.contactPhone)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(
                    conversation.lastMessageAt ?? conversation.updatedAt,
                  )}
                </span>
              </div>
              {conversation.lastMessagePreview ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {conversation.lastMessagePreview}
                </p>
              ) : null}
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 self-start text-[10px] ${getConversationStatusClassName(conversation.status)}`}
            >
              {getConversationStatusLabel(conversation.status)}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
