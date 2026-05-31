"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquareIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import type { ConversationListItem } from "@/types/chat.types";
import { formatRelativeTime } from "@/utils/dashboard";

type ChatListProps = {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
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

export function ChatList({
  conversations,
  activeConversationId,
  className,
}: ChatListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildConversationHref(conversationId: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("conversation", conversationId);
    return `${pathname}?${params.toString()}`;
  }

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
            href={buildConversationHref(conversation.id)}
            className={cn(
              "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
              isActive && "bg-muted",
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {conversation.contactName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{conversation.contactName}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(
                    conversation.lastMessageAt ?? conversation.updatedAt,
                  )}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {conversation.contactPhone}
              </p>
              {conversation.lastMessagePreview ? (
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.lastMessagePreview}
                </p>
              ) : null}
            </div>
            <Badge
              variant={getStatusVariant(conversation.status)}
              className="shrink-0 self-start"
            >
              {conversation.status}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
