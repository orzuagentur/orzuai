"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import {
  Maximize2Icon,
  MessageSquareIcon,
  Minimize2Icon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  StarIcon,
} from "lucide-react";

import { InboxChatComposer } from "@/components/chats/inbox/InboxChatComposer";
import { EmailChatComposer } from "@/components/chats/inbox/EmailChatComposer";
import { ChatAiToggle } from "@/components/chats/inbox/ChatAiToggle";
import { InboxChatMenu } from "@/components/chats/inbox/InboxChatMenu";
import { useOptionalInboxLayout } from "@/components/chats/inbox/inbox-layout-context";
import { useAgentTypingIndicator } from "@/hooks/use-agent-typing-indicator";
import { useSendChatMedia } from "@/hooks/use-send-chat-media";
import {
  clearMessageUploadProgress,
  setMessageUploadProgress,
} from "@/lib/client/message-upload-progress-store";
import { ContactAvatar } from "@/components/contacts/ContactAvatar";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { MessageHistory, type MessageHistoryHandle } from "@/components/chats/MessageHistory";
import { MessageHistorySkeleton } from "@/components/chats/MessageHistorySkeleton";
import { Button } from "@/components/ui/button";
import { toggleContactFavoriteAction } from "@/features/chats/actions/toggle-contact-favorite";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { chatHeaderClassName } from "@/features/chats/chat-theme";
import {
  getChannelBadgeClassName,
  getChannelBadgeLabel,
} from "@/features/chats/channel-ui";
import { Badge } from "@/components/ui/badge";
import { useSendChatMessage } from "@/hooks/use-send-chat-message";
import { cn } from "@/lib/utils";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ChatMessageData, ConversationDetail } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { formatContactIdentifier } from "@/utils/contact-display";
import { cacheChatMessageMediaUrl } from "@/utils/cache-chat-media-url";
import { isChatScrollPinnedToBottom } from "@/utils/chat-scroll";
import { deriveDefaultEmailReplySubject } from "@/utils/email-message";
import { throttle } from "@/utils/throttle";
import {
  createOptimisticChatMessage,
  createOptimisticMediaChatMessage,
  createOptimisticMessageId,
} from "@/utils/optimistic-chat-message";

type ChatLoadingPreview = {
  contactName: string;
  contactPhone: string;
  channel: MessagingChannel;
};

type ChatWindowProps = {
  conversation: ConversationDetail | null;
  aiEnabled: boolean | null;
  onAiEnabledChange?: (enabled: boolean) => void;
  channelConnected: boolean;
  channel: MessagingChannel;
  cannedResponses: CannedResponseItem[];
  isLoadingConversation?: boolean;
  loadingPreview?: ChatLoadingPreview | null;
  draft?: string;
  onDraftChange?: (value: string) => void;
  suggestReplyOpen?: boolean;
  onSuggestReplyOpenChange?: (open: boolean) => void;
  onOptimisticMessage?: (message: ChatMessageData) => void;
  onMessageSent?: (message: ChatMessageData, pendingId?: string) => void;
  onSendFailed?: (pendingId: string) => void;
  onMessageRemoved?: (messageId: string) => void;
  onMessageUpdated?: (message: ChatMessageData) => void;
  onContactDeleted?: () => void;
  onContactFavoriteChange?: (contactId: string, isFavorite: boolean) => void;
  isClientTyping?: boolean;
  isReplyTyping?: boolean;
  autoReplyError?: { code: string; message: string } | null;
  onDismissAutoReplyError?: () => void;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
  onConversationViewed?: () => void;
  onReadProgress?: (readAt: string) => void;
  onQuickRepliesOpen?: () => void;
  className?: string;
};

function getChannelNotConnectedMessage(channel: MessagingChannel): string {
  if (channel === "instagram") {
    return CHAT_MESSAGES.instagramNotConnected;
  }

  if (channel === "telegram") {
    return CHAT_MESSAGES.telegramNotConnected;
  }

  if (channel === "website_forms") {
    return CHAT_MESSAGES.websiteFormsNotConnected;
  }

  if (channel === "email") {
    return CHAT_MESSAGES.emailNotConnected;
  }

  return CHAT_MESSAGES.whatsappNotConnected;
}

export function ChatWindow({
  conversation,
  aiEnabled,
  onAiEnabledChange,
  channelConnected,
  channel,
  cannedResponses,
  isLoadingConversation = false,
  loadingPreview = null,
  draft: controlledDraft,
  onDraftChange,
  suggestReplyOpen: controlledSuggestOpen,
  onSuggestReplyOpenChange,
  onOptimisticMessage,
  onMessageSent,
  onSendFailed,
  onMessageRemoved,
  onMessageUpdated,
  onContactDeleted,
  onContactFavoriteChange,
  isClientTyping = false,
  isReplyTyping = false,
  autoReplyError = null,
  onDismissAutoReplyError,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
  onConversationViewed,
  onReadProgress,
  onQuickRepliesOpen,
  className,
}: ChatWindowProps) {
  const canSend = channelConnected;
  const channelNotConnectedMessage = getChannelNotConnectedMessage(channel);
  const router = useRouter();
  const [internalDraft, setInternalDraft] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [composerTab, setComposerTab] = useState<"reply" | "note">("reply");
  const [internalSuggestOpen, setInternalSuggestOpen] = useState(false);
  const suggestOpen = controlledSuggestOpen ?? internalSuggestOpen;
  const setSuggestOpen = onSuggestReplyOpenChange ?? setInternalSuggestOpen;
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageHistoryRef = useRef<MessageHistoryHandle>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const pinnedConversationIdRef = useRef<string | null>(null);
  const scrollHeightBeforeOlderLoadRef = useRef(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const draft = controlledDraft ?? internalDraft;
  const setDraft = onDraftChange ?? setInternalDraft;
  const inboxLayout = useOptionalInboxLayout();
  const [isFavorite, setIsFavorite] = useState(
    conversation?.contactIsFavorite ?? false,
  );
  const [isFavoritePending, startFavoriteTransition] = useTransition();

  useEffect(() => {
    setIsFavorite(conversation?.contactIsFavorite ?? false);
  }, [conversation?.contactId, conversation?.contactIsFavorite]);

  useEffect(() => {
    if (conversation?.channel === "email") {
      setEmailSubject(deriveDefaultEmailReplySubject(conversation.messages));
      return;
    }

    setEmailSubject("");
  }, [conversation?.id, conversation?.channel, conversation?.messages]);

  useEffect(() => {
    if (!conversation && inboxLayout?.chatFullscreen) {
      inboxLayout.setChatFullscreen(false);
    }
  }, [conversation, inboxLayout]);

  const { sendMessage, isLoading } = useSendChatMessage({
    onSuccess: (result) => {
      if (!result.success) {
        router.refresh();
      }
    },
  });

  useAgentTypingIndicator({
    conversationId: conversation?.id ?? null,
    draft,
    enabled:
      composerTab === "reply" &&
      canSend &&
      Boolean(conversation),
  });

  const { sendMedia, isLoading: isSendingMedia, uploadProgress } =
    useSendChatMedia();

  const reportMediaUploadProgressRef = useRef(
    throttle((messageId: string, progress: {
      percent: number;
      bytesPerSecond?: number;
      phase: NonNullable<ChatMessageData["uploadPhase"]>;
    }) => {
      setMessageUploadProgress(messageId, progress);
    }, 200),
  );

  const scrollToLatestMessage = useCallback(() => {
    messageHistoryRef.current?.scrollToEnd({ instant: true });
    setShowScrollToBottom(false);
    setNewMessagesBelow(0);
  }, []);

  useEffect(() => {
    if (!isLoadingOlderMessages) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollHeightBeforeOlderLoadRef.current = scrollContainer.scrollHeight;
    }
  }, [isLoadingOlderMessages]);

  useEffect(() => {
    if (isLoadingOlderMessages) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || scrollHeightBeforeOlderLoadRef.current <= 0) {
      return;
    }

    const previousScrollHeight = scrollHeightBeforeOlderLoadRef.current;
    scrollHeightBeforeOlderLoadRef.current = 0;
    scrollContainer.scrollTop +=
      scrollContainer.scrollHeight - previousScrollHeight;
  }, [
    conversation?.messages.length,
    isLoadingOlderMessages,
  ]);

  useEffect(() => {
    lastMessageIdRef.current = null;
    setShowScrollToBottom(false);
    setNewMessagesBelow(0);
  }, [conversation?.id]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || !conversation) {
      return;
    }

    function handleScroll() {
      const pinned = isChatScrollPinnedToBottom(scrollContainer!);
      setShowScrollToBottom(!pinned);

      if (pinned) {
        setNewMessagesBelow(0);
        lastMessageIdRef.current =
          conversation!.messages.at(-1)?.id ?? null;
        onConversationViewed?.();
      }
    }

    handleScroll();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [conversation, onConversationViewed]);

  useEffect(() => {
    if (!conversation) {
      pinnedConversationIdRef.current = null;
      return;
    }

    const lastMessage = conversation.messages.at(-1);

    if (!lastMessage) {
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const isNewMessage = lastMessageIdRef.current !== lastMessage.id;

    if (!isNewMessage) {
      return;
    }

    const wasKnownMessage = lastMessageIdRef.current !== null;
    lastMessageIdRef.current = lastMessage.id;

    if (
      wasKnownMessage &&
      lastMessage.senderType === "client" &&
      scrollContainer &&
      !isChatScrollPinnedToBottom(scrollContainer)
    ) {
      setNewMessagesBelow((current) => current + 1);
      setShowScrollToBottom(true);
      return;
    }

    const isOpeningChat =
      pinnedConversationIdRef.current !== conversation.id;
    pinnedConversationIdRef.current = conversation.id;

    if (isOpeningChat) {
      if (
        lastMessage.senderType === "user" ||
        lastMessage.senderType === "ai"
      ) {
        scrollToLatestMessage();
      }
      onConversationViewed?.();
      return;
    }

    const shouldFollowLatestMessage =
      lastMessage.senderType === "user" ||
      lastMessage.senderType === "ai" ||
      Boolean(
        scrollContainer && isChatScrollPinnedToBottom(scrollContainer),
      );

    if (shouldFollowLatestMessage) {
      scrollToLatestMessage();
      onConversationViewed?.();
    }
  }, [
    conversation?.id,
    conversation?.messages.at(-1)?.id,
    onConversationViewed,
    scrollToLatestMessage,
  ]);

  function handleScrolledToBottom() {
    setShowScrollToBottom(false);
    setNewMessagesBelow(0);
    lastMessageIdRef.current = conversation?.messages.at(-1)?.id ?? null;
    onConversationViewed?.();
  }

  function handleToggleFavorite() {
    if (!conversation?.contactId || isFavoritePending) {
      return;
    }

    startFavoriteTransition(() => {
      void (async () => {
        const result = await toggleContactFavoriteAction({
          contactId: conversation.contactId!,
        });

        if (!result.success) {
          toast.error(result.error.message);
          return;
        }

        setIsFavorite(result.data.isFavorite);
        onContactFavoriteChange?.(
          result.data.contactId,
          result.data.isFavorite,
        );

        if (result.data.isFavorite) {
          toast.success(CHAT_MESSAGES.favoriteAddedTitle, {
            description: CHAT_MESSAGES.favoriteAddedDescription(
              result.data.contactName,
            ),
          });
          return;
        }

        toast.info(CHAT_MESSAGES.favoriteRemovedTitle, {
          description: CHAT_MESSAGES.favoriteRemovedDescription(
            result.data.contactName,
          ),
        });
      })();
    });
  }

  if (!conversation) {
    if (isLoadingConversation && loadingPreview) {
      return (
        <div
          className={cn(
            "flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden bg-background",
            className,
          )}
        >
          <div className="shrink-0 border-b bg-background px-4 py-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{loadingPreview.contactName}</p>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${getChannelBadgeClassName(loadingPreview.channel)}`}
                  >
                    <ChannelBrandIcon
                      channel={loadingPreview.channel}
                      className="size-3.5"
                    />
                    {getChannelBadgeLabel(loadingPreview.channel)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatContactIdentifier(loadingPreview.contactPhone)}
                </p>
              </div>
            </div>
          </div>
          <MessageHistorySkeleton className="min-h-0 flex-1 overflow-y-auto" />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center",
          className,
        )}
      >
        <MessageSquareIcon className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {CHAT_MESSAGES.selectConversationOverview}
        </p>
      </div>
    );
  }

  async function sendReplyMessage() {
    if (!conversation || !draft.trim() || composerTab !== "reply") {
      return;
    }

    const content = draft.trim();
    const subject = conversation.channel === "email" ? emailSubject.trim() : "";
    const pendingId = createOptimisticMessageId();

    if (conversation.channel === "email" && !subject) {
      toast.error(`${CHAT_MESSAGES.emailSubjectLabel} is required.`);
      return;
    }

    onOptimisticMessage?.(
      createOptimisticChatMessage({
        id: pendingId,
        conversationId: conversation.id,
        channel: conversation.channel,
        content,
        emailSubject: conversation.channel === "email" ? subject : null,
      }),
    );
    setDraft("");
    scrollToLatestMessage();
    requestAnimationFrame(scrollToLatestMessage);

    void (async () => {
      const result = await sendMessage({
        conversationId: conversation.id,
        content,
        ...(conversation.channel === "email" ? { emailSubject: subject } : {}),
      });

      if (result.success && result.data?.message) {
        onMessageSent?.(result.data.message, pendingId);
        return;
      }

      onSendFailed?.(pendingId);
      setDraft(content);
      if (conversation.channel === "email") {
        setEmailSubject(subject);
      }
    })();
  }

  async function handleInboxSend() {
    await sendReplyMessage();
  }

  return (
      <div className={cn("flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden", className)}>
        <div className={cn("shrink-0 px-4 py-3", chatHeaderClassName)}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <ContactAvatar
              name={conversation.contactName}
              avatarUrl={conversation.contactAvatarUrl}
              className="size-10 shrink-0"
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{conversation.contactName}</p>
                <Badge
                  variant="outline"
                  className={`gap-1 ${getChannelBadgeClassName(conversation.channel)}`}
                >
                  <ChannelBrandIcon
                    channel={conversation.channel}
                    className="size-3.5"
                  />
                  {getChannelBadgeLabel(conversation.channel)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isClientTyping
                  ? CHAT_MESSAGES.customerTyping(conversation.contactName)
                  : formatContactIdentifier(conversation.contactPhone)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {inboxLayout ? (
                <ChatAiToggle
                  channel={conversation.channel}
                  aiEnabled={aiEnabled}
                  onEnabledChange={onAiEnabledChange}
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={!conversation.contactId || isFavoritePending}
                aria-label={CHAT_MESSAGES.favoriteToggleLabel}
                aria-pressed={isFavorite}
                onClick={handleToggleFavorite}
              >
                <StarIcon
                  className={cn(
                    "size-4",
                    isFavorite
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground",
                  )}
                />
              </Button>
              {inboxLayout ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={
                    inboxLayout.chatFullscreen
                      ? CHAT_MESSAGES.chatExitFullscreen
                      : CHAT_MESSAGES.chatFullscreen
                  }
                  aria-pressed={inboxLayout.chatFullscreen}
                  onClick={inboxLayout.toggleChatFullscreen}
                >
                  {inboxLayout.chatFullscreen ? (
                    <Minimize2Icon className="size-4" />
                  ) : (
                    <Maximize2Icon className="size-4" />
                  )}
                </Button>
              ) : null}
              <InboxChatMenu
                conversation={conversation}
                onContactDeleted={onContactDeleted}
              />
              {inboxLayout ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden size-8 xl:inline-flex"
                  aria-label={
                    inboxLayout.detailsOpen
                      ? CHAT_MESSAGES.hideContactDetails
                      : CHAT_MESSAGES.showContactDetails
                  }
                  aria-pressed={inboxLayout.detailsOpen && !suggestOpen}
                  onClick={() => {
                    setSuggestOpen(false);
                    inboxLayout.toggleDetails();
                  }}
                >
                  {inboxLayout.detailsOpen ? (
                    <PanelRightCloseIcon className="size-4" />
                  ) : (
                    <PanelRightOpenIcon className="size-4" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
            <MessageHistory
              key={conversation.id}
              ref={messageHistoryRef}
              conversationId={conversation.id}
              messages={conversation.messages}
              variant="inbox"
              lastReadAt={conversation.lastReadAt}
              className="min-h-0 flex-1"
              scrollContainerRef={scrollContainerRef}
              firstUnreadRef={firstUnreadRef}
              bottomRef={bottomRef}
              isClientTyping={isClientTyping}
              isReplyTyping={isReplyTyping}
              typingContactName={conversation.contactName}
              contactName={conversation.contactName}
              contactAvatarUrl={conversation.contactAvatarUrl}
              onMessageRemoved={onMessageRemoved}
              onMessageUpdated={onMessageUpdated}
              hasOlderMessages={hasOlderMessages}
              isLoadingOlderMessages={isLoadingOlderMessages}
              onLoadOlderMessages={onLoadOlderMessages}
              onReadProgress={onReadProgress}
              showScrollToBottom={showScrollToBottom}
              newMessagesBelow={newMessagesBelow}
              onScrollToBottom={handleScrolledToBottom}
            />

            {autoReplyError && inboxLayout ? (
              <div className="shrink-0 border-t bg-destructive/5 px-4 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-destructive">
                      {CHAT_MESSAGES.autoReplyErrorTitle}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      {autoReplyError.message}
                    </p>
                  </div>
                  {onDismissAutoReplyError ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      onClick={onDismissAutoReplyError}
                    >
                      {CHAT_MESSAGES.autoReplyErrorDismiss}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {conversation.channel === "email" ? (
              <EmailChatComposer
                conversationId={conversation.id}
                internalNote={conversation.internalNote}
                subject={emailSubject}
                onSubjectChange={setEmailSubject}
                draft={draft}
                onDraftChange={setDraft}
                cannedResponses={cannedResponses}
                canSend={canSend}
                channelNotConnectedMessage={channelNotConnectedMessage}
                isSending={isLoading}
                composerTab={composerTab}
                onComposerTabChange={setComposerTab}
                onSubmit={() => {
                  void handleInboxSend();
                }}
                onOpenAiSuggest={() => {
                  inboxLayout?.setDetailsOpen(false);
                  setSuggestOpen(true);
                }}
                onQuickRepliesOpen={onQuickRepliesOpen}
              />
            ) : (
              <InboxChatComposer
                conversationId={conversation.id}
                channel={conversation.channel}
                internalNote={conversation.internalNote}
                draft={draft}
                onDraftChange={setDraft}
                cannedResponses={cannedResponses}
                canSend={canSend}
                channelNotConnectedMessage={channelNotConnectedMessage}
                websiteFormsHint={conversation.channel === "website_forms"}
                isSending={isLoading}
                isSendingMedia={isSendingMedia}
                mediaUploadProgress={uploadProgress}
                composerTab={composerTab}
                onComposerTabChange={setComposerTab}
                onSubmit={() => {
                  void handleInboxSend();
                }}
                onOpenAiSuggest={() => {
                  inboxLayout?.setDetailsOpen(false);
                  setSuggestOpen(true);
                }}
                onQuickRepliesOpen={onQuickRepliesOpen}
                onSendMedia={(file, caption) => {
                  const pendingId = createOptimisticMessageId();
                  const optimisticMessage = createOptimisticMediaChatMessage({
                    id: pendingId,
                    conversationId: conversation.id,
                    channel: conversation.channel,
                    file,
                    caption,
                  });

                  onOptimisticMessage?.(optimisticMessage);
                  scrollToLatestMessage();
                  requestAnimationFrame(scrollToLatestMessage);

                  void (async () => {
                    const result = await sendMedia(
                      conversation.id,
                      file,
                      caption,
                      {
                        onProgress: (progress) => {
                          reportMediaUploadProgressRef.current(
                            pendingId,
                            progress,
                          );
                        },
                      },
                    );

                    if (result.success && result.data?.message) {
                      clearMessageUploadProgress(pendingId);

                      if (result.data.mediaSignedUrl) {
                        cacheChatMessageMediaUrl(
                          result.data.message,
                          result.data.mediaSignedUrl,
                        );
                      }

                      onMessageSent?.(result.data.message, pendingId);
                      return;
                    }

                    onSendFailed?.(pendingId);
                    clearMessageUploadProgress(pendingId);
                  })();

                  return true;
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
}
