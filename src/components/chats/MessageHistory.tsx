import type { RefObject } from "react";

import { ChatMediaMessage } from "@/components/chats/inbox/ChatMediaMessage";
import { cn } from "@/lib/utils";
import type { ChatMessageData } from "@/types/chat.types";
import { parseMediaMessage } from "@/utils/chat-media";
import { formatRelativeTime } from "@/utils/dashboard";

type MessageHistoryProps = {
  messages: ChatMessageData[];
  variant?: "default" | "inbox";
  bottomRef?: RefObject<HTMLDivElement | null>;
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
  bottomRef,
  className,
}: MessageHistoryProps) {
  const isInbox = variant === "inbox";
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
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-4 py-4",
        isInbox && "gap-1.5 bg-muted/20",
        className,
      )}
    >
      {messages.map((message) => {
        const isOutgoing =
          message.senderType === "user" || message.senderType === "ai";
        const { media, text } = parseMediaMessage(message.content);

        return (
          <div
            key={message.id}
            className={cn(
              "flex min-w-0 w-full",
              isOutgoing ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[min(78%,32rem)] min-w-0 rounded-lg px-3 py-2 text-sm shadow-sm",
                isOutgoing
                  ? isInbox
                    ? "rounded-br-sm bg-emerald-600 text-white"
                    : "rounded-br-md bg-primary text-primary-foreground"
                  : isInbox
                    ? "rounded-bl-sm border bg-card text-foreground"
                    : "rounded-bl-md bg-muted",
              )}
            >
              {!isInbox ? (
                <p className="text-[11px] font-medium opacity-80">
                  {getSenderLabel(message)}
                </p>
              ) : null}
              {media ? (
                <ChatMediaMessage
                  media={media}
                  caption={text}
                  isOutgoing={isOutgoing}
                />
              ) : (
                <p className="overflow-wrap-anywhere whitespace-pre-wrap break-words">
                  {text}
                </p>
              )}
              <p
                className={cn(
                  "mt-1 text-right text-[10px]",
                  isOutgoing
                    ? isInbox
                      ? "text-emerald-100"
                      : "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                {formatRelativeTime(message.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      {bottomRef ? <div ref={bottomRef} /> : null}
    </div>
  );
}
