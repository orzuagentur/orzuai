"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  Clock3Icon,
  Loader2Icon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MessageDateTime } from "@/components/ui/message-date-time";

import { ChatMediaMessage } from "@/components/chats/inbox/ChatMediaMessage";
import { ExpandableMessageText } from "@/components/chats/inbox/ExpandableMessageText";
import { MediaUploadProgressOverlay } from "@/components/chats/inbox/MediaUploadProgressOverlay";
import { ChatMessageActionsMenu } from "@/components/chats/ChatMessageActionsMenu";
import { TypingIndicator } from "@/components/chats/TypingIndicator";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMessageUploadProgress } from "@/hooks/use-message-upload-progress";
import { usePrefetchVisibleConversationMedia } from "@/hooks/use-prefetch-conversation-media";
import { cn } from "@/lib/utils";
import { scrollChatToBottom } from "@/utils/chat-scroll";
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
  onReadProgress?: (readAt: string) => void;
  showScrollToBottom?: boolean;
  newMessagesBelow?: number;
  onScrollToBottom?: () => void;
  className?: string;
};

export type MessageHistoryHandle = {
  scrollToEnd: () => void;
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
  if (message.senderType !== "user") {
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
    !message.isPending &&
    (message.deliveryStatus === "pending" || message.deliveryStatus === "processing")
  ) {
    return (
      <Loader2Icon
        className="size-3 shrink-0 animate-spin opacity-80"
        aria-label={CHAT_MESSAGES.messageSending}
      />
    );
  }

  if (message.deliveryStatus === "read") {
    return (
      <BookOpenIcon
        className="size-2.5 shrink-0 opacity-90"
        aria-label={CHAT_MESSAGES.messageRead}
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

function messageContentEqual(
  left: ChatMessageData,
  right: ChatMessageData,
): boolean {
  return (
    left.id === right.id &&
    left.content === right.content &&
    left.senderType === right.senderType &&
    left.aiGenerated === right.aiGenerated &&
    left.createdAt === right.createdAt &&
    left.isPending === right.isPending &&
    left.deliveryStatus === right.deliveryStatus &&
    left.attachmentPending === right.attachmentPending &&
    left.attachmentFailed === right.attachmentFailed &&
    left.deletedForAllAt === right.deletedForAllAt &&
    left.hiddenForBusiness === right.hiddenForBusiness &&
    left.editedAt === right.editedAt &&
    left.isEdited === right.isEdited
  );
}

function MessageUploadOverlay({ messageId }: { messageId: string }) {
  const uploadProgress = useMessageUploadProgress(messageId, true);

  if (!uploadProgress || uploadProgress.phase === "completing") {
    return null;
  }

  return (
    <MediaUploadProgressOverlay
      progress={uploadProgress.percent}
      speedBps={uploadProgress.bytesPerSecond}
      phase={uploadProgress.phase}
    />
  );
}

function MessageUploadStatus({
  message,
  isOutgoing,
  isInbox,
}: {
  message: ChatMessageData;
  isOutgoing: boolean;
  isInbox: boolean;
}) {
  const uploadProgress = useMessageUploadProgress(
    message.id,
    Boolean(message.isPending),
  );

  return (
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
        uploadProgress?.phase === "uploading" ? (
          <>
            {formatUploadPercent(uploadProgress.percent)}
            {uploadProgress.bytesPerSecond
              ? ` · ${formatUploadSpeed(uploadProgress.bytesPerSecond)}`
              : null}
          </>
        ) : uploadProgress?.phase === "preparing" ? (
          CHAT_MESSAGES.mediaUploadPreparing
        ) : uploadProgress?.phase === "completing" ? (
          CHAT_MESSAGES.mediaUploadCompleting
        ) : (
          CHAT_MESSAGES.messageSending
        )
      ) : (
        <MessageDateTime value={message.createdAt} />
      )}
      <OutboundDeliveryIndicator message={message} />
    </p>
  );
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
  onReadProgress?: (readAt: string) => void;
  scrollRootRef?: RefObject<HTMLDivElement | null>;
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
  onReadProgress,
  scrollRootRef,
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
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInbox || !isUnreadMessage || !onReadProgress || message.senderType !== "client") {
      return;
    }

    const element = messageRef.current;
    const root = scrollRootRef?.current;

    if (!element || !root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          onReadProgress(message.createdAt);
        }
      },
      {
        root,
        threshold: 0.65,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    isInbox,
    isUnreadMessage,
    message.createdAt,
    message.senderType,
    onReadProgress,
    scrollRootRef,
  ]);

  return (
    <div ref={messageRef} className="flex min-w-0 w-full flex-col gap-2 pb-2">
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
              {message.isPending && media ? (
                <MessageUploadOverlay messageId={message.id} />
              ) : null}
            </div>
          ) : (
            <ExpandableMessageText
              text={text}
              mutedActionClassName={
                isOutgoing
                  ? isInbox
                    ? "text-emerald-100"
                    : "text-primary-foreground/80"
                  : "text-muted-foreground"
              }
            />
          )}
          <MessageUploadStatus
            message={message}
            isOutgoing={isOutgoing}
            isInbox={isInbox}
          />
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

const MemoMessageHistoryItem = memo(
  MessageHistoryItem,
  (previous, next) =>
    previous.index === next.index &&
    previous.firstUnreadIndex === next.firstUnreadIndex &&
    previous.isInbox === next.isInbox &&
    previous.lastReadAt === next.lastReadAt &&
    previous.showMessageActions === next.showMessageActions &&
    previous.onMessageRemoved === next.onMessageRemoved &&
    previous.onMessageUpdated === next.onMessageUpdated &&
    previous.onReadProgress === next.onReadProgress &&
    previous.scrollRootRef === next.scrollRootRef &&
    messageContentEqual(previous.message, next.message),
);

export const MessageHistory = forwardRef<
  MessageHistoryHandle,
  MessageHistoryProps
>(function MessageHistory(
  {
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
    onReadProgress,
    showScrollToBottom = false,
    newMessagesBelow = 0,
    onScrollToBottom,
    className,
  },
  ref,
) {
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

  const visibleRangeKey = useMemo(
    () =>
      shouldVirtualize && messages.length > 0
        ? `${visibleIndices[0] ?? 0}-${visibleIndices[visibleIndices.length - 1] ?? 0}`
        : messages.length > 0
          ? `0-${messages.length - 1}`
          : "",
    [messages.length, shouldVirtualize, visibleIndices],
  );

  usePrefetchVisibleConversationMedia(
    messages,
    visibleIndices,
    messages.length > 0 && Boolean(visibleRangeKey),
  );

  const scrollToEnd = useCallback(() => {
    const lastIndex = messages.length - 1;

    const runScroll = () => {
      if (shouldVirtualize && lastIndex >= 0) {
        virtualizer.scrollToIndex(lastIndex, { align: "end" });
      }

      const scrollContainer = scrollContainerRef?.current;

      if (scrollContainer) {
        scrollChatToBottom(scrollContainer, "auto");
      }
    };

    runScroll();
    requestAnimationFrame(runScroll);
    requestAnimationFrame(() => {
      requestAnimationFrame(runScroll);
    });
  }, [
    messages.length,
    scrollContainerRef,
    shouldVirtualize,
    virtualizer,
  ]);

  useImperativeHandle(ref, () => ({ scrollToEnd }), [scrollToEnd]);

  function handleScrollToBottomClick() {
    scrollToEnd();
    onScrollToBottom?.();
  }

  const scrollAreaClassName = cn(
    "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-4",
    isInbox && "bg-muted/20",
  );

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 flex-col",
          className,
        )}
      >
        <div
          ref={scrollContainerRef ? mergeRefs(scrollContainerRef) : undefined}
          className={cn(
            scrollAreaClassName,
            "items-center justify-center text-sm text-muted-foreground",
          )}
        >
          No messages in this conversation yet.
          {bottomRef ? <div ref={bottomRef} className="hidden" /> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col",
        className,
      )}
    >
      <div
        ref={scrollContainerRef ? mergeRefs(scrollContainerRef) : undefined}
        className={scrollAreaClassName}
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
                <MemoMessageHistoryItem
                  message={message}
                  index={virtualRow.index}
                  firstUnreadIndex={firstUnreadIndex}
                  firstUnreadRef={firstUnreadRef}
                  isInbox={isInbox}
                  lastReadAt={lastReadAt}
                  showMessageActions={showMessageActions}
                  onMessageRemoved={onMessageRemoved}
                  onMessageUpdated={onMessageUpdated}
                  onReadProgress={onReadProgress}
                  scrollRootRef={scrollContainerRef}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2">
          {messages.map((message, index) => (
            <MemoMessageHistoryItem
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
              onReadProgress={onReadProgress}
              scrollRootRef={scrollContainerRef}
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

      {showScrollToBottom && isInbox ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="pointer-events-auto relative size-9 rounded-full shadow-md"
            aria-label={
              newMessagesBelow > 0
                ? CHAT_MESSAGES.newMessagesBelow(newMessagesBelow)
                : CHAT_MESSAGES.scrollToBottom
            }
            onClick={handleScrollToBottomClick}
          >
            <ChevronDownIcon className="size-4" />
            {newMessagesBelow > 0 ? (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {newMessagesBelow > 9 ? "9+" : newMessagesBelow}
              </span>
            ) : null}
          </Button>
        </div>
      ) : null}
    </div>
  );
});
