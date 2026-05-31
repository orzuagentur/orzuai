import { cn } from "@/lib/utils";
import type { ChatMessageData } from "@/types/chat.types";
import { formatRelativeTime } from "@/utils/dashboard";

type MessageHistoryProps = {
  messages: ChatMessageData[];
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

export function MessageHistory({ messages, className }: MessageHistoryProps) {
  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center px-4 py-8 text-sm text-muted-foreground",
          className,
        )}
      >
        No messages in this conversation yet.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4", className)}>
      {messages.map((message) => {
        const isOutgoing =
          message.senderType === "user" || message.senderType === "ai";

        return (
          <div
            key={message.id}
            className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] space-y-1 rounded-2xl px-3 py-2 text-sm",
                isOutgoing
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-muted",
              )}
            >
              <p className="text-[11px] font-medium opacity-80">
                {getSenderLabel(message)}
              </p>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <p
                className={cn(
                  "text-[10px]",
                  isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {formatRelativeTime(message.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
