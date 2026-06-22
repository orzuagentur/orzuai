"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  Clock3Icon,
  Loader2Icon,
} from "lucide-react";

import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { Button } from "@/components/ui/button";
import { MessageDateTime } from "@/components/ui/message-date-time";

import { ChatMediaMessage } from "@/components/chats/inbox/ChatMediaMessage";
import { ExpandableMessageText } from "@/components/chats/inbox/ExpandableMessageText";
import { MediaUploadProgressOverlay } from "@/components/chats/inbox/MediaUploadProgressOverlay";
import { ChatMessageActionsMenu } from "@/components/chats/ChatMessageActionsMenu";
import { TypingIndicator } from "@/components/chats/TypingIndicator";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  chatPaneClassName,
  chatUnreadDividerClassName,
  getChatBubbleClassName,
  getChatBubbleMetaClassName,
  getChatBubbleMutedActionClassName,
} from "@/features/chats/chat-theme";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMessageUploadProgress } from "@/hooks/use-message-upload-progress";
import { usePrefetchVisibleConversationMedia } from "@/hooks/use-prefetch-conversation-media";
import { cn } from "@/lib/utils";
import { scrollChatToBottom, setChatScrollToBottomInstant } from "@/utils/chat-scroll";
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
  conversationId?: string;
  messages: ChatMessageData[];
  variant?: "default" | "inbox";
  lastReadAt?: string | null;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  firstUnreadRef?: RefObject<HTMLDivElement | null>;
  bottomRef?: RefObject<HTMLDivElement | null>;
  isClientTyping?: boolean;
  isReplyTyping?: boolean;
  autoReplyError?: { code: string; message: string } | null;
  onDismissAutoReplyError?: () => void;
  typingContactName?: string;
  contactName?: string;
  contactAvatarUrl?: string | null;
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
  scrollToEnd: (options?: { instant?: boolean }) => void;
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
        className="size-3 shrink-0 text-red-500 dark:text-red-400"
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
      <CheckCheckIcon
        className="size-3 shrink-0 text-[#53bdeb]"
        aria-label={CHAT_MESSAGES.messageRead}
      />
    );
  }

  if (message.deliveryStatus === "delivered") {
    return (
      <CheckCheckIcon
        className="size-3 shrink-0 text-[#667781] dark:text-[#99beb7]"
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
}: {
  message: ChatMessageData;
  isOutgoing: boolean;
}) {
  const uploadProgress = useMessageUploadProgress(
    message.id,
    Boolean(message.isPending),
  );
  const showInstantSent =
    message.isPending &&
    message.senderType === "user" &&
    !uploadProgress;

  return (
    <p className={getChatBubbleMetaClassName(isOutgoing)}>
      {message.isPending && !showInstantSent ? (
        <Clock3Icon className="size-3 shrink-0" aria-hidden />
      ) : null}
      {message.isPending && !showInstantSent ? (
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

function MessageSenderAvatar({
  contactName,
  contactAvatarUrl,
}: {
  contactName: string;
  contactAvatarUrl?: string | null;
}) {
  return (
    <ContactAvatar
      name={contactName}
      avatarUrl={contactAvatarUrl}
      size="sm"
      className="mb-0.5 size-7 shrink-0 self-end"
      aria-hidden
    />
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
  contactName: string;
  contactAvatarUrl?: string | null;
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
  contactName,
  contactAvatarUrl,
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
          <div className={cn("h-px flex-1", chatUnreadDividerClassName.line)} />
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              chatUnreadDividerClassName.pill,
            )}
          >
            {CHAT_MESSAGES.unreadDivider}
          </span>
          <div className={cn("h-px flex-1", chatUnreadDividerClassName.line)} />
        </div>
      ) : null}
      <div
        className={cn(
          "group/message flex min-w-0 w-full items-end gap-1",
          isOutgoing ? "justify-end" : "justify-start",
        )}
      >
        {!isOutgoing && isInbox ? (
          <MessageSenderAvatar
            contactName={contactName}
            contactAvatarUrl={contactAvatarUrl}
          />
        ) : null}
        {canShowMessageActions && isOutgoing ? (
          <ChatMessageActionsMenu
            message={message}
            isOutgoing={isOutgoing}
            onMessageRemoved={onMessageRemoved!}
          />
        ) : null}
        <div
          className={cn(
            getChatBubbleClassName({
              isOutgoing,
              isDeleted,
              isUnread: isInbox && isUnreadMessage,
              hasMedia: Boolean(media),
              isAudioMessage: isAudioMessage,
            }),
            message.isPending && media && "opacity-80",
          )}
        >
          {!isInbox ? (
            <p className="text-[11px] font-medium opacity-80">
              {getSenderLabel(message)}
            </p>
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
                showDownloadButton={
                  !isOutgoing ||
                  (!message.isPending && !message.attachmentPending)
                }
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
              mutedActionClassName={getChatBubbleMutedActionClassName(isOutgoing)}
            />
          )}
          <MessageUploadStatus
            message={message}
            isOutgoing={isOutgoing}
          />
        </div>
        {canShowMessageActions && !isOutgoing ? (
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
    previous.contactName === next.contactName &&
    previous.contactAvatarUrl === next.contactAvatarUrl &&
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
    conversationId,
    messages,
    variant = "default",
    lastReadAt = null,
    scrollContainerRef,
    firstUnreadRef,
    bottomRef,
    isClientTyping = false,
    isReplyTyping = false,
    typingContactName = "Customer",
    contactName = typingContactName,
    contactAvatarUrl = null,
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
  const [isScrollAnchored, setIsScrollAnchored] = useState(false);
  const anchoredConversationIdRef = useRef<string | null>(null);

  const firstUnreadIndex = findFirstUnreadClientMessageIndex(
    messages,
    lastReadAt,
  );

  const shouldVirtualize = messages.length >= MESSAGE_VIRTUALIZE_THRESHOLD;

  const estimatedScrollOffset = useMemo(
    () =>
      messages.reduce(
        (total, message) => total + estimateMessageRowSize(message),
        0,
      ),
    [messages],
  );

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? messages.length : 0,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: (index) => estimateMessageRowSize(messages[index]!),
    overscan: 6,
    getItemKey: (index) => messages[index]?.id ?? index,
    initialOffset: shouldVirtualize ? estimatedScrollOffset : undefined,
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

  const scrollToEnd = useCallback(
    (options?: { instant?: boolean }) => {
      const instant = options?.instant ?? false;
      const lastIndex = messages.length - 1;

      const runScroll = () => {
        if (shouldVirtualize && lastIndex >= 0) {
          if (instant) {
            virtualizer.scrollToEnd({ behavior: "auto" });
          } else {
            virtualizer.scrollToIndex(lastIndex, { align: "end", behavior: "auto" });
          }
        }

        const scrollContainer = scrollContainerRef?.current;

        if (scrollContainer) {
          if (instant) {
            setChatScrollToBottomInstant(scrollContainer);
          } else {
            scrollChatToBottom(scrollContainer, "auto");
          }
        }
      };

      runScroll();

      if (!instant) {
        requestAnimationFrame(runScroll);
        requestAnimationFrame(() => {
          requestAnimationFrame(runScroll);
        });
      }
    },
    [
      messages.length,
      scrollContainerRef,
      shouldVirtualize,
      virtualizer,
    ],
  );

  useLayoutEffect(() => {
    if (messages.length === 0) {
      anchoredConversationIdRef.current = conversationId ?? null;
      setIsScrollAnchored(true);
      return;
    }

    const shouldAnchorToBottom =
      Boolean(conversationId) &&
      anchoredConversationIdRef.current !== conversationId;

    if (!shouldAnchorToBottom) {
      setIsScrollAnchored(true);
      return;
    }

    scrollToEnd({ instant: true });
    anchoredConversationIdRef.current = conversationId ?? null;
    setIsScrollAnchored(true);
  }, [conversationId, messages.length, scrollToEnd]);

  useImperativeHandle(ref, () => ({ scrollToEnd }), [scrollToEnd]);

  function handleScrollToBottomClick() {
    scrollToEnd();
    onScrollToBottom?.();
  }

  const scrollAreaClassName = cn(
    "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4 sm:py-4",
    chatPaneClassName,
    !isScrollAnchored && "invisible",
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
                  contactName={contactName}
                  contactAvatarUrl={contactAvatarUrl}
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
              contactName={contactName}
              contactAvatarUrl={contactAvatarUrl}
              onMessageRemoved={onMessageRemoved}
              onMessageUpdated={onMessageUpdated}
              onReadProgress={onReadProgress}
              scrollRootRef={scrollContainerRef}
            />
          ))}
        </div>
      )}

      {isClientTyping && isInbox ? (
        <div className="flex min-w-0 w-full items-end justify-start gap-1">
          <ContactAvatar
            name={contactName}
            avatarUrl={contactAvatarUrl}
            size="sm"
            className="mb-0.5 size-7 shrink-0"
            aria-hidden
          />
          <TypingIndicator
            label={CHAT_MESSAGES.customerTyping(typingContactName)}
          />
        </div>
      ) : null}
      {isReplyTyping && isInbox ? (
        <div className="flex min-w-0 w-full items-end justify-end gap-1">
          <TypingIndicator
            label={CHAT_MESSAGES.replyTypingLabel}
            variant="outgoing"
          />
        </div>
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
