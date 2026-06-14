"use client";

import type { RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  Clock3Icon,
  Loader2Icon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";

import { ChatMediaMessage } from "@/components/chats/inbox/ChatMediaMessage";
import { MediaUploadProgressOverlay } from "@/components/chats/inbox/MediaUploadProgressOverlay";
import { ChatMessageActionsMenu } from "@/components/chats/ChatMessageActionsMenu";
import { TypingIndicator } from "@/components/chats/TypingIndicator";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { usePrefetchVisibleConversationMedia } from "@/hooks/use-prefetch-conversation-media";
import { cn } from "@/lib/utils";
import type { ChatMessageData } from "@/types/chat.types";
import { parseMediaMessage, isMediaPendingHydration } from "@/utils/chat-media";
import {
  formatUploadPercent,
  formatUploadSpeed,
} from "@/utils/format-upload-rate";
import { isChatMessageDeletedForAll } from "@/utils/chat";
import { mergeRefs } from "@/utils/merge-refs";
import {
  findFirstUnreadClientMessageIndex,
  isUnreadClientMessage,
} from "@/utils/message-unread";

const MESSAGE_ROW_ESTIMATE_PX = 88;
const MESSAGE_MEDIA_ROW_ESTIMATE_PX = 220;
const MESSAGE_VIRTUALIZE_THRESHOLD = 25;

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
  onMessageUpdated?: (message: ChatMessageData) => void;
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

function OutboundDeliveryIndicator({ message }: { message: ChatMessageData }) {
  if (message.senderType !== "user" || message.isPending) {
    return null;
  }

  if (message.deliveryStatus === "failed") {
    return (
      <AlertCircleIcon
        className="size-3 shrink-0 text-red-300"
        aria-label={CHAT_MESSAGES.messageDeliveryFailed}
      />
    );
  }

  if (
    message.deliveryStatus === "pending" ||
    message.deliveryStatus === "processing"
  ) {
    return (
      <Loader2Icon
        className="size-3 shrink-0 animate-spin opacity-80"
        aria-label={CHAT_MESSAGES.messageSending}
      />
    );
  }

  if (message.deliveryStatus === "delivered") {
    return (
      <CheckCheckIcon
        className="size-3 shrink-0 opacity-90"
        aria-hidden
      />
    );
  }

  if (message.deliveryStatus === "sent") {
    return (
      <CheckIcon
        className="size-3 shrink-0 opacity-90"
        aria-hidden
      />
    );
  }

  return null;
}

function estimateMessageRowSize(message: ChatMessageData): number {
  const { media } = parseMediaMessage(message.content);

  if (media) {
    return MESSAGE_MEDIA_ROW_ESTIMATE_PX;
  }

  return MESSAGE_ROW_ESTIMATE_PX;
}

type MessageHistoryItemProps = {
  message: ChatMessageData;
  index: number;
  firstUnreadIndex: number;
  firstUnreadRef?: RefObject<HTMLDivElement | null>;
  isInbox: boolean;
  lastReadAt: string | null;
  showMessageActions: boolean;
  onMessageRemoved?: (messageId: string) => void;
  onMessageUpdated?: (message: ChatMessageData) => void;
};

function MessageHistoryItem({
  message,
  index,
  firstUnreadIndex,
  firstUnreadRef,
  isInbox,
  lastReadAt,
  showMessageActions,
  onMessageRemoved,
  onMessageUpdated,
}: MessageHistoryItemProps) {
  const isOutgoing =
    message.senderType === "user" || message.senderType === "ai";
  const isDeleted = isChatMessageDeletedForAll(message);
  const { media, text } = parseMediaMessage(message.content);
  const isAudioMessage = media?.kind === "audio";
  const showUnreadDivider = isInbox && index === firstUnreadIndex;
  const isUnreadMessage =
    isInbox && isUnreadClientMessage(message, lastReadAt);
  const canShowMessageActions = showMessageActions && !message.isPending;

  return (
    <div className="flex min-w-0 w-full flex-col gap-2 pb-2">
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
        {canShowMessageActions && !isOutgoing ? (
          <ChatMessageActionsMenu
            message={message}
            isOutgoing={isOutgoing}
            onMessageRemoved={onMessageRemoved!}
          />
        ) : null}
        <div
          className={cn(
            "max-w-[min(85%,28rem)] min-w-0 shrink rounded-lg text-sm shadow-sm",
            media
              ? isAudioMessage
                ? "px-2 py-1"
                : "px-1.5 py-1.5"
              : "px-3 py-2",
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
            <div className="relative">
              <ChatMediaMessage
                media={media}
                messageId={message.id}
                caption={text}
                isOutgoing={isOutgoing}
                isHydrating={
                  Boolean(message.attachmentPending) ||
                  isMediaPendingHydration(media)
                }
                isFailed={Boolean(message.attachmentFailed)}
                onRetryStateChange={
                  onMessageUpdated
                    ? (state) => {
                        onMessageUpdated({
                          ...message,
                          attachmentPending: state.attachmentPending,
                          attachmentFailed: state.attachmentFailed,
                        });
                      }
                    : undefined
                }
              />
              {message.isPending &&
              message.uploadPhase &&
              message.uploadPhase !== "completing" ? (
                <MediaUploadProgressOverlay
                  progress={message.uploadProgress ?? 0}
                  speedBps={message.uploadSpeedBps}
                  phase={message.uploadPhase}
                />
              ) : null}
            </div>
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
              message.uploadPhase === "uploading" &&
              message.uploadProgress != null ? (
                <>
                  {formatUploadPercent(message.uploadProgress)}
                  {message.uploadSpeedBps
                    ? ` · ${formatUploadSpeed(message.uploadSpeedBps)}`
                    : null}
                </>
              ) : message.uploadPhase === "preparing" ? (
                CHAT_MESSAGES.mediaUploadPreparing
              ) : message.uploadPhase === "completing" ? (
                CHAT_MESSAGES.mediaUploadCompleting
              ) : (
                CHAT_MESSAGES.messageSending
              )
            ) : (
              <RelativeTime value={message.createdAt} />
            )}
            <OutboundDeliveryIndicator message={message} />
          </p>
        </div>
        {canShowMessageActions && isOutgoing ? (
          <ChatMessageActionsMenu
            message={message}
            isOutgoing={isOutgoing}
            onMessageRemoved={onMessageRemoved!}
          />
        ) : null}
      </div>
    </div>
  );
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
  onMessageUpdated,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
  className,
}: MessageHistoryProps) {
  const isInbox = variant === "inbox";
  const showMessageActions = Boolean(onMessageRemoved);
  const firstUnreadIndex = findFirstUnreadClientMessageIndex(
    messages,
    lastReadAt,
  );

  const shouldVirtualize = messages.length >= MESSAGE_VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? messages.length : 0,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: (index) => estimateMessageRowSize(messages[index]!),
    overscan: 6,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];
  const visibleIndices = shouldVirtualize
    ? virtualItems.map((item) => item.index)
    : messages.map((_, index) => index);

  usePrefetchVisibleConversationMedia(
    messages,
    visibleIndices,
    messages.length > 0,
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
      ref={scrollContainerRef ? mergeRefs(scrollContainerRef) : undefined}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-4",
        isInbox && "bg-muted/20",
        className,
      )}
    >
      {hasOlderMessages && onLoadOlderMessages ? (
        <div className="flex shrink-0 justify-center pb-1">
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

      {shouldVirtualize ? (
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const message = messages[virtualRow.index];

            if (!message) {
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
                <MessageHistoryItem
                  message={message}
                  index={virtualRow.index}
                  firstUnreadIndex={firstUnreadIndex}
                  firstUnreadRef={firstUnreadRef}
                  isInbox={isInbox}
                  lastReadAt={lastReadAt}
                  showMessageActions={showMessageActions}
                  onMessageRemoved={onMessageRemoved}
                  onMessageUpdated={onMessageUpdated}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2">
          {messages.map((message, index) => (
            <MessageHistoryItem
              key={message.id}
              message={message}
              index={index}
              firstUnreadIndex={firstUnreadIndex}
              firstUnreadRef={firstUnreadRef}
              isInbox={isInbox}
              lastReadAt={lastReadAt}
              showMessageActions={showMessageActions}
              onMessageRemoved={onMessageRemoved}
              onMessageUpdated={onMessageUpdated}
            />
          ))}
        </div>
      )}

      {isClientTyping && isInbox ? (
        <TypingIndicator
          label={CHAT_MESSAGES.customerTyping(typingContactName)}
        />
      ) : null}
      {bottomRef ? <div ref={bottomRef} className="shrink-0" /> : null}
    </div>
  );
}
