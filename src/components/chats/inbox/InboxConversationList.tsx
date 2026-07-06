"use client";

import { useRef, type RefObject } from "react";
import { Loader2Icon } from "lucide-react";

import { ChatList } from "@/components/chats/ChatList";
import { InboxToolbar } from "@/components/chats/inbox/InboxToolbar";
import { Button } from "@/components/ui/button";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import type { InboxChromeConfig } from "@/components/chats/inbox/inbox-chrome-context";
import type { ChatChannelId } from "@/features/chats";
import type { ConversationListItem } from "@/types/chat.types";
import { cn } from "@/lib/utils";

type InboxConversationListProps = {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  channelId: ChatChannelId | "voice" | "sms";
  linkToConversationChannel?: boolean;
  linkMode?: "channel" | "overview" | "favorites";
  onConversationSelect?: (conversationId: string) => void;
  emptyVariant?: "default" | "search" | "favorites";
  toolbar: InboxChromeConfig | null;
  hasMore?: boolean;
  isFetching?: boolean;
  onLoadMore?: () => void;
  className?: string;
};

export function InboxConversationList({
  conversations,
  activeConversationId,
  channelId,
  linkToConversationChannel = false,
  linkMode = "overview",
  onConversationSelect,
  emptyVariant = "default",
  toolbar,
  hasMore = false,
  isFetching = false,
  onLoadMore,
  className,
}: InboxConversationListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain"
      >
        {toolbar ? (
          <div className="sticky top-0 z-10 shrink-0 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <InboxToolbar {...toolbar} />
          </div>
        ) : null}

        <ChatList
          conversations={conversations}
          activeConversationId={activeConversationId}
          channelId={channelId}
          linkToConversationChannel={linkToConversationChannel}
          linkMode={linkMode}
          onConversationSelect={onConversationSelect}
          variant="inbox"
          emptyVariant={emptyVariant}
          scrollElementRef={scrollRef as RefObject<HTMLElement | null>}
          className="min-h-0 flex-1"
        />

        {hasMore ? (
          <div className="shrink-0 border-t p-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={isFetching}
              onClick={onLoadMore}
            >
              {isFetching ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : null}
              {CHAT_MESSAGES.loadMoreConversationsShort}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
