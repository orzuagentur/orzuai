"use client";

import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  getChannelBadgeLabel,
  getChannelBadgeVariant,
} from "@/features/chats/channel-ui";
import type { ChatChannelId } from "@/features/chats";
import type { ConversationListItem } from "@/types/chat.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { formatRelativeTime } from "@/utils/dashboard";

type ChatListProps = {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  channelId: ChatChannelId;
  hideChannelBadge?: boolean;
  className?: string;
};

function getStatusVariant(
  status: ConversationListItem["status"],
): "default" | "secondary" | "outline" {
  if (status === "active") {
    return "default";
  }

  if (status === "archived") {
    return "secondary";
  }

  return "outline";
}

function buildConversationHref(
  channelId: ChatChannelId,
  conversationId: string,
): string {
  return `${DASHBOARD_ROUTES.chats}/${channelId}?conversation=${conversationId}`;
}

export function ChatList({
  conversations,
  activeConversationId,
  channelId,
  hideChannelBadge = false,
  className,
}: ChatListProps) {
  if (conversations.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 px-4 py-12 text-center",
          className,
        )}
      >
        <MessageSquareIcon className="size-8 text-muted-foreground" />
        <p className="font-medium">{CHAT_MESSAGES.emptyListTitle}</p>
        <p className="text-sm text-muted-foreground">
          {CHAT_MESSAGES.emptyListDescription}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("divide-y", className)}>
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;

        return (
          <Link
            key={conversation.id}
            href={buildConversationHref(channelId, conversation.id)}
            className={cn(
              "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
              isActive && "bg-primary/5",
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {conversation.contactName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-medium">{conversation.contactName}</p>
                  {!hideChannelBadge ? (
                    <Badge
                      variant={getChannelBadgeVariant(conversation.channel)}
                      className="shrink-0 px-1.5 py-0 text-[10px]"
                    >
                      {getChannelBadgeLabel(conversation.channel)}
                    </Badge>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(
                    conversation.lastMessageAt ?? conversation.updatedAt,
                  )}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {formatContactIdentifier(conversation.contactPhone)}
              </p>
              {conversation.lastMessagePreview ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {conversation.lastMessagePreview}
                </p>
              ) : null}
            </div>
            <Badge
              variant={getStatusVariant(conversation.status)}
              className="hidden shrink-0 self-start sm:inline-flex"
            >
              {conversation.status}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
