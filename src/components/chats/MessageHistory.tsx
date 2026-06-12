import type { RefObject } from "react";
import { Clock3Icon, Loader2Icon, SparklesIcon, UserRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";

import { ChatMediaMessage } from "@/components/chats/inbox/ChatMediaMessage";
import { ChatMessageActionsMenu } from "@/components/chats/ChatMessageActionsMenu";
import { TypingIndicator } from "@/components/chats/TypingIndicator";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { cn } from "@/lib/utils";
import type { ChatMessageData } from "@/types/chat.types";
import { parseMediaMessage } from "@/utils/chat-media";
import { isChatMessageDeletedForAll } from "@/utils/chat";
import {
  findFirstUnreadClientMessageIndex,
  isUnreadClientMessage,
} from "@/utils/message-unread";

type MessageHistoryProps = {
  messages: ChatMessageData[];
  variant?: "default" | "inbox";
  lastReadAt?: string | null;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  firstUnreadRef?: RefObject<HTMLDivElement | null>;
  bottomRef?: RefObject<HTMLDivElement | null>;
  isClientTyping?: boolean;
  typingContactName?: string;
  onMessageRemoved?: (messageId: string) => void;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
  className?: string;
};

function getSenderLabel(message: ChatMessageData): string {
  if (message.senderType === "client") {
    return "Customer";
  }

  if (message.senderType === "ai") {
    return "AI Assistant";
  }

  return "You";
}

export function MessageHistory({
  messages,
  variant = "default",
  lastReadAt = null,
  scrollContainerRef,
  firstUnreadRef,
  bottomRef,
  isClientTyping = false,
  typingContactName = "Customer",
  onMessageRemoved,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
  className,
}: MessageHistoryProps) {
  const isInbox = variant === "inbox";
  const showMessageActions = Boolean(onMessageRemoved);
  const canShowMessageActions = (message: ChatMessageData) =>
    showMessageActions && !message.isPending;
  const firstUnreadIndex = findFirstUnreadClientMessageIndex(
    messages,
    lastReadAt,
  );

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-8 text-sm text-muted-foreground",
          className,
        )}
      >
        No messages in this conversation yet.
        {bottomRef ? <div ref={bottomRef} className="hidden" /> : null}
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-4 py-4",
        isInbox && "gap-1.5 bg-muted/20",
        className,
      )}
    >
      {hasOlderMessages && onLoadOlderMessages ? (
        <div className="flex justify-center pb-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            disabled={isLoadingOlderMessages}
            onClick={onLoadOlderMessages}
          >
            {isLoadingOlderMessages ? (
              <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            ) : null}
            {CHAT_MESSAGES.loadOlderMessages}
          </Button>
        </div>
      ) : null}
      {messages.map((message, index) => {
        const isOutgoing =
          message.senderType === "user" || message.senderType === "ai";
        const isDeleted = isChatMessageDeletedForAll(message);
        const { media, text } = parseMediaMessage(message.content);
        const showUnreadDivider = isInbox && index === firstUnreadIndex;
        const isUnreadMessage =
          isInbox && isUnreadClientMessage(message, lastReadAt);

        return (
          <div key={message.id} className="flex min-w-0 w-full flex-col gap-2">
            {showUnreadDivider ? (
              <div
                ref={firstUnreadRef}
                className="flex items-center gap-3 py-1"
                role="separator"
                aria-label={CHAT_MESSAGES.unreadDivider}
              >
                <div className="h-px flex-1 bg-primary/30" />
                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {CHAT_MESSAGES.unreadDivider}
                </span>
                <div className="h-px flex-1 bg-primary/30" />
              </div>
            ) : null}
            <div
              className={cn(
                "group/message flex min-w-0 w-full items-end gap-1",
                isOutgoing ? "justify-end" : "justify-start",
              )}
            >
              {canShowMessageActions(message) && !isOutgoing ? (
                <ChatMessageActionsMenu
                  message={message}
                  isOutgoing={isOutgoing}
                  onMessageRemoved={onMessageRemoved!}
                />
              ) : null}
              <div
                className={cn(
                  "max-w-[min(85%,28rem)] min-w-0 shrink rounded-lg text-sm shadow-sm",
                  media ? "px-1.5 py-1.5" : "px-3 py-2",
                  message.isPending && "opacity-80",
                  isDeleted
                    ? "border border-dashed bg-muted/40 text-muted-foreground"
                    : isOutgoing
                      ? isInbox
                        ? "rounded-br-sm bg-emerald-600 text-white"
                        : "rounded-br-md bg-primary text-primary-foreground"
                      : isInbox
                        ? "rounded-bl-sm border bg-card text-foreground"
                        : "rounded-bl-md bg-muted",
                  isInbox &&
                    isUnreadMessage &&
                    !isDeleted &&
                    "ring-2 ring-primary/25 ring-offset-2 ring-offset-muted/20",
                )}
              >
                {!isInbox ? (
                  <p className="text-[11px] font-medium opacity-80">
                    {getSenderLabel(message)}
                  </p>
                ) : null}
                {isInbox && isOutgoing && !isDeleted ? (
                  <div className="mb-1 flex items-center gap-1 opacity-90">
                    {message.senderType === "ai" ? (
                      <SparklesIcon className="size-3 shrink-0" aria-hidden />
                    ) : (
                      <UserRoundIcon className="size-3 shrink-0" aria-hidden />
                    )}
                    <span className="text-[10px] font-medium">
                      {message.senderType === "ai"
                        ? CHAT_MESSAGES.replyFromAi
                        : CHAT_MESSAGES.replyFromYou}
                    </span>
                  </div>
                ) : null}
                {isDeleted ? (
                  <p className="text-sm italic">{CHAT_MESSAGES.messageDeletedForAll}</p>
                ) : media ? (
                  <ChatMediaMessage
                    media={media}
                    caption={text}
                    isOutgoing={isOutgoing}
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                    {text}
                  </p>
                )}
                <p
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[10px]",
                    isOutgoing
                      ? isInbox
                        ? "text-emerald-100"
                        : "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {message.isPending ? (
                    <Clock3Icon className="size-3 shrink-0" aria-hidden />
                  ) : null}
                  {message.isPending ? (
                    CHAT_MESSAGES.messageSending
                  ) : (
                    <RelativeTime value={message.createdAt} />
                  )}
                </p>
              </div>
              {canShowMessageActions(message) && isOutgoing ? (
                <ChatMessageActionsMenu
                  message={message}
                  isOutgoing={isOutgoing}
                  onMessageRemoved={onMessageRemoved!}
                />
              ) : null}
            </div>
          </div>
        );
      })}
      {isClientTyping && isInbox ? (
        <TypingIndicator
          label={CHAT_MESSAGES.customerTyping(typingContactName)}
        />
      ) : null}
      {bottomRef ? <div ref={bottomRef} /> : null}
    </div>
  );
}
