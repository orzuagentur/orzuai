"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchConversationDetailAction } from "@/features/chats/actions/fetch-conversation-detail";
import { fetchOlderConversationMessagesAction } from "@/features/chats/actions/fetch-older-conversation-messages";
import { markConversationReadAction } from "@/features/chats/actions/mark-conversation-read";
import { fetchCannedResponsesAction } from "@/features/canned-responses/actions/fetch-canned-responses";
import { isInboxMessagingChannel } from "@/features/integrations/constants";
import type { MessagingChannel } from "@/types/database.types";
import { useActiveConversationPolling } from "@/hooks/use-active-conversation-polling";
import { useConversationRealtime } from "@/hooks/use-conversation-realtime";
import { useRealtimeFallbackReady } from "@/hooks/use-realtime-fallback-ready";
import type { ConversationReconnectCursor } from "@/lib/realtime/conversation-channel";
import {
  getCachedMediaUrl,
  isConversationDetailFresh,
  peekCachedConversationDetail,
  setCachedConversationDetail,
} from "@/lib/client-cache/inbox-messenger-cache";
import { revokeOptimisticMediaContent } from "@/utils/optimistic-chat-message";
import { withPendingDeliveryStatus } from "@/utils/chat";
import {
  buildMediaUrlCacheKey,
  encodeMediaMessage,
  parseMediaMessage,
} from "@/utils/chat-media";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ChatMessageData, ConversationDetail } from "@/types/chat.types";
import type { MessageDeliveryStatus } from "@/types/database.types";
import {
  applyMessageMetadataPatch,
  hasMessageMetadataChanged,
} from "@/utils/message-metadata";

type UseInboxActiveConversationOptions = {
  initialConversationId: string | null;
  initialConversation: ConversationDetail | null;
  initialChannelConnected: boolean;
  initialAiEnabled: boolean | null;
  initialCannedResponses: CannedResponseItem[];
};

function resolveConversationBootstrap(
  options: UseInboxActiveConversationOptions,
) {
  const hasSsrConversation = Boolean(
    options.initialConversation &&
      options.initialConversationId &&
      options.initialConversation.id === options.initialConversationId,
  );

  const cachedDetail =
    !hasSsrConversation && options.initialConversationId
      ? peekCachedConversationDetail(options.initialConversationId)
      : null;

  if (hasSsrConversation && options.initialConversation) {
    return {
      conversation: options.initialConversation,
      channelConnected: options.initialChannelConnected,
      aiEnabled: options.initialAiEnabled,
      cannedResponses: options.initialCannedResponses,
      skipInitialLoad: true,
    };
  }

  if (cachedDetail) {
    return {
      conversation: cachedDetail.conversation,
      channelConnected: cachedDetail.channelConnected,
      aiEnabled: cachedDetail.aiEnabled,
      cannedResponses: cachedDetail.cannedResponses,
      skipInitialLoad: true,
    };
  }

  return {
    conversation: options.initialConversation,
    channelConnected: options.initialChannelConnected,
    aiEnabled: options.initialAiEnabled,
    cannedResponses: options.initialCannedResponses,
    skipInitialLoad: false,
  };
}

export function useInboxActiveConversation({
  initialConversationId,
  initialConversation,
  initialChannelConnected,
  initialAiEnabled,
  initialCannedResponses,
}: UseInboxActiveConversationOptions) {
  const bootstrap = resolveConversationBootstrap({
    initialConversationId,
    initialConversation,
    initialChannelConnected,
    initialAiEnabled,
    initialCannedResponses,
  });

  const [selectedConversationId, setSelectedConversationId] = useState(
    initialConversationId,
  );
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    bootstrap.conversation,
  );
  const [channelConnected, setChannelConnected] = useState(
    bootstrap.channelConnected,
  );
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(bootstrap.aiEnabled);
  const [cannedResponses, setCannedResponses] = useState(
    bootstrap.cannedResponses,
  );
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const requestIdRef = useRef(0);
  const skipInitialLoadRef = useRef(bootstrap.skipInitialLoad);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const lastReadSyncAtRef = useRef(0);
  selectedConversationIdRef.current = selectedConversationId;

  useEffect(() => {
    lastReadSyncAtRef.current = 0;
  }, [selectedConversationId]);

  const clearConversation = useCallback(() => {
    setConversation(null);
    setChannelConnected(false);
    setAiEnabled(null);
    setCannedResponses([]);
    setIsLoadingConversation(false);
    setIsLoadingOlderMessages(false);
  }, []);

  const refreshCannedResponses = useCallback(
    async (channel?: MessagingChannel | null) => {
      const result = await fetchCannedResponsesAction(
        channel && isInboxMessagingChannel(channel) ? { channel } : {},
      );

      if (result.success) {
        setCannedResponses(result.data.cannedResponses);
      }
    },
    [],
  );

  const loadConversation = useCallback(
    async (conversationId: string, silent = false) => {
      const requestId = ++requestIdRef.current;

      if (!silent) {
        setIsLoadingConversation(true);
      }

      const result = await fetchConversationDetailAction({ conversationId });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!result.success) {
        if (!silent) {
          clearConversation();
        }
        return;
      }

      setConversation(result.data.conversation);
      setChannelConnected(result.data.channelConnected);
      setAiEnabled(result.data.aiEnabled);
      setCannedResponses(result.data.cannedResponses);
      setCachedConversationDetail(conversationId, {
        conversation: result.data.conversation,
        channelConnected: result.data.channelConnected,
        aiEnabled: result.data.aiEnabled,
        cannedResponses: result.data.cannedResponses,
      });
      setIsLoadingConversation(false);
    },
    [clearConversation],
  );

  const refreshConversation = useCallback(
    async (silent = false) => {
      if (!selectedConversationId) {
        return;
      }

      await loadConversation(selectedConversationId, silent);
    },
    [loadConversation, selectedConversationId],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!conversation?.hasOlderMessages || conversation.messages.length === 0) {
      return;
    }

    setIsLoadingOlderMessages(true);

    try {
      const result = await fetchOlderConversationMessagesAction({
        conversationId: conversation.id,
        beforeCreatedAt: conversation.messages[0]!.createdAt,
      });

      if (!result.success) {
        return;
      }

      setConversation((current) => {
        if (!current || current.id !== conversation.id) {
          return current;
        }

        const existingIds = new Set(current.messages.map((message) => message.id));
        const olderMessages = result.data.messages.filter(
          (message) => !existingIds.has(message.id),
        );

        return {
          ...current,
          messages: [...olderMessages, ...current.messages],
          hasOlderMessages: result.data.hasMore,
        };
      });
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [conversation]);

  const updateReadProgress = useCallback((readAt: string) => {
    setConversation((current) => {
      if (!current) {
        return current;
      }

      if (
        current.lastReadAt &&
        new Date(readAt).getTime() <= new Date(current.lastReadAt).getTime()
      ) {
        return current;
      }

      return {
        ...current,
        lastReadAt: readAt,
      };
    });
  }, []);

  const syncConversationReadNow = useCallback(async (conversationId: string) => {
    lastReadSyncAtRef.current = Date.now();

    const result = await markConversationReadAction({
      conversationId,
    });

    return result.success;
  }, []);

  const markConversationViewed = useCallback(() => {
    if (!conversation) {
      return;
    }

    const readAt = new Date().toISOString();
    const hasUnread = conversation.messages.some(
      (message) =>
        message.senderType === "client" &&
        (!conversation.lastReadAt ||
          new Date(message.createdAt).getTime() >
            new Date(conversation.lastReadAt).getTime()),
    );

    if (!hasUnread && conversation.lastReadAt) {
      return;
    }

    setConversation((current) => {
      if (!current || current.id !== conversation.id) {
        return current;
      }

      return {
        ...current,
        lastReadAt: readAt,
      };
    });

    const now = Date.now();

    if (now - lastReadSyncAtRef.current < 1500) {
      return;
    }

    lastReadSyncAtRef.current = now;

    void markConversationReadAction({
      conversationId: conversation.id,
    });
  }, [conversation]);

  const appendMessage = useCallback((message: ChatMessageData) => {
    setConversation((current) => {
      if (!current || current.id !== message.conversationId) {
        return current;
      }

      if (current.messages.some((item) => item.id === message.id)) {
        return current;
      }

      const withoutMatchingPending =
        message.senderType === "user"
          ? current.messages.filter(
              (item) =>
                !(
                  item.isPending &&
                  item.senderType === "user" &&
                  item.content === message.content
                ),
            )
          : current.messages;
      const removedPendingCount =
        current.messages.length - withoutMatchingPending.length;

      return {
        ...current,
        messages: [...withoutMatchingPending, message],
        totalMessageCount:
          current.totalMessageCount - removedPendingCount + 1,
        updatedAt: message.createdAt,
      };
    });
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setConversation((current) => {
      if (!current) {
        return current;
      }

      const removedMessage = current.messages.find((item) => item.id === messageId);

      if (!removedMessage) {
        return current;
      }

      revokeOptimisticMediaContent(removedMessage.content);

      return {
        ...current,
        messages: current.messages.filter((item) => item.id !== messageId),
        totalMessageCount: Math.max(0, current.totalMessageCount - 1),
      };
    });
  }, []);

  const reconcileMessage = useCallback(
    (pendingId: string, message: ChatMessageData) => {
      setConversation((current) => {
        if (!current || current.id !== message.conversationId) {
          return current;
        }

        const pendingMessage = current.messages.find(
          (item) => item.id === pendingId,
        );
        const withoutPending = current.messages.filter(
          (item) => item.id !== pendingId,
        );
        const hasReal = withoutPending.some((item) => item.id === message.id);
        let resolvedMessage = message;

        if (pendingMessage) {
          const pendingParsed = parseMediaMessage(pendingMessage.content);
          const realParsed = parseMediaMessage(message.content);
          const pendingBlobUrl = pendingParsed.media?.url?.startsWith("blob:")
            ? pendingParsed.media.url
            : null;
          let keepBlob = false;

          if (pendingBlobUrl && realParsed.media) {
            const cacheKey = buildMediaUrlCacheKey(
              realParsed.media,
              message.id,
            );

            if (!cacheKey || !getCachedMediaUrl(cacheKey)) {
              resolvedMessage = {
                ...message,
                content: encodeMediaMessage(
                  { ...realParsed.media, url: pendingBlobUrl },
                  realParsed.text,
                ),
              };
              keepBlob = true;
            }
          }

          if (!keepBlob) {
            revokeOptimisticMediaContent(pendingMessage.content);
          }
        }

        if (hasReal) {
          if (withoutPending.length === current.messages.length) {
            return current;
          }

          return {
            ...current,
            messages: withoutPending,
            totalMessageCount: Math.max(
              0,
              current.totalMessageCount -
                (current.messages.length - withoutPending.length),
            ),
          };
        }

        resolvedMessage = withPendingDeliveryStatus(resolvedMessage);

        const hadPending = current.messages.some((item) => item.id === pendingId);

        return {
          ...current,
          messages: [...withoutPending, resolvedMessage],
          totalMessageCount: hadPending
            ? current.totalMessageCount
            : current.totalMessageCount + 1,
          updatedAt: resolvedMessage.createdAt,
        };
      });
    },
    [],
  );

  const updateMessage = useCallback((message: ChatMessageData) => {
    setConversation((current) => {
      if (!current || current.id !== message.conversationId) {
        return current;
      }

      const index = current.messages.findIndex((item) => item.id === message.id);

      if (index === -1) {
        return {
          ...current,
          messages: [...current.messages, message],
          totalMessageCount: current.totalMessageCount + 1,
          updatedAt: message.editedAt ?? message.createdAt,
        };
      }

      const previous = current.messages[index]!;

      if (!hasMessageMetadataChanged(previous, message)) {
        return current;
      }

      const messages = [...current.messages];
      messages[index] = message;

      return {
        ...current,
        messages,
        updatedAt: message.editedAt ?? message.createdAt,
      };
    });
  }, []);

  const patchMessageDeliveryStatus = useCallback(
    (messageId: string, deliveryStatus: MessageDeliveryStatus) => {
      setConversation((current) => {
        if (!current) {
          return current;
        }

        const messages = applyMessageMetadataPatch(current.messages, messageId, {
          deliveryStatus,
        });

        if (!messages) {
          return current;
        }

        return {
          ...current,
          messages,
        };
      });
    },
    [],
  );

  const appendMessageRef = useRef(appendMessage);
  const updateMessageRef = useRef(updateMessage);
  const patchMessageDeliveryStatusRef = useRef(patchMessageDeliveryStatus);
  const removeMessageRef = useRef(removeMessage);
  const reconnectCursorRef = useRef<ConversationReconnectCursor | null>(null);
  appendMessageRef.current = appendMessage;
  updateMessageRef.current = updateMessage;
  patchMessageDeliveryStatusRef.current = patchMessageDeliveryStatus;
  removeMessageRef.current = removeMessage;

  const latestMessageAt = useMemo(() => {
    if (!conversation) {
      return null;
    }

    return (
      conversation.messages.at(-1)?.createdAt ?? "1970-01-01T00:00:00.000Z"
    );
  }, [conversation]);

  const latestMessageId = useMemo(() => {
    if (!conversation) {
      return null;
    }

    return conversation.messages.at(-1)?.id ?? null;
  }, [conversation]);

  const reconnectCursor = useMemo((): ConversationReconnectCursor | null => {
    if (!latestMessageAt || !latestMessageId) {
      return null;
    }

    return {
      afterCreatedAt: latestMessageAt,
      afterMessageId: latestMessageId,
    };
  }, [latestMessageAt, latestMessageId]);

  const { isClientTyping, isRealtimeConnected } = useConversationRealtime({
    conversationId: selectedConversationId,
    reconnectCursor,
    getReconnectCursor: () => reconnectCursorRef.current,
    onMessage: (message) => {
      appendMessageRef.current(message);
    },
    onMessageUpdated: (message) => {
      updateMessageRef.current(message);
    },
    onDeliveryStatusUpdated: (payload) => {
      patchMessageDeliveryStatusRef.current(payload.message_id, payload.status);
    },
    onMessageHidden: (messageId) => {
      removeMessageRef.current(messageId);
    },
    onGapSync: ({ newMessages, recentMessages, cursor }) => {
      reconnectCursorRef.current = cursor;

      for (const message of newMessages) {
        appendMessageRef.current(message);
      }

      for (const message of recentMessages) {
        updateMessageRef.current(message);
      }
    },
    onReconnectCursorChange: (cursor) => {
      reconnectCursorRef.current = cursor;
    },
  });

  useEffect(() => {
    if (!latestMessageAt) {
      reconnectCursorRef.current = null;
      return;
    }

    reconnectCursorRef.current = {
      afterCreatedAt: latestMessageAt,
      afterMessageId: latestMessageId,
    };
  }, [latestMessageAt, latestMessageId, selectedConversationId]);

  const pollingEnabled =
    Boolean(selectedConversationId && conversation) && !isRealtimeConnected;
  const syncRecentMessages = useRealtimeFallbackReady(
    isRealtimeConnected,
    pollingEnabled,
  );

  useActiveConversationPolling({
    conversationId: selectedConversationId,
    latestMessageAt,
    latestMessageId,
    enabled: pollingEnabled,
    pollNewMessages: true,
    syncRecentMessages,
    onNewMessages: (messages) => {
      for (const message of messages) {
        appendMessageRef.current(message);
      }
    },
    onSyncMessages: (messages) => {
      for (const message of messages) {
        updateMessageRef.current(message);
      }
    },
  });

  const selectConversation = useCallback(
    (conversationId: string | null) => {
      setSelectedConversationId(conversationId);

      if (typeof window === "undefined") {
        if (!conversationId) {
          clearConversation();
        }
        return;
      }

      const nextUrl = new URL(window.location.href);

      if (!conversationId) {
        nextUrl.searchParams.delete("conversation");
        window.history.replaceState(null, "", nextUrl.toString());
        clearConversation();
        return;
      }

      const cached = peekCachedConversationDetail(conversationId);

      if (cached) {
        setConversation(cached.conversation);
        setChannelConnected(cached.channelConnected);
        setAiEnabled(cached.aiEnabled);
        setCannedResponses(cached.cannedResponses);
        setIsLoadingConversation(false);
      } else {
        setConversation(null);
        setIsLoadingConversation(true);
      }

      if (nextUrl.searchParams.get("conversation") !== conversationId) {
        nextUrl.searchParams.set("conversation", conversationId);
        window.history.replaceState(null, "", nextUrl.toString());
      }
    },
    [clearConversation],
  );

  useEffect(() => {
    if (!selectedConversationId) {
      clearConversation();
      return;
    }

    const cached = peekCachedConversationDetail(selectedConversationId);

    if (cached) {
      setConversation(cached.conversation);
      setChannelConnected(cached.channelConnected);
      setAiEnabled(cached.aiEnabled);
      setCannedResponses(cached.cannedResponses);
      setIsLoadingConversation(false);
    }

    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false;

      if (!isConversationDetailFresh(selectedConversationId)) {
        void loadConversation(selectedConversationId, true);
      }

      return;
    }

    if (cached && isConversationDetailFresh(selectedConversationId)) {
      return;
    }

    void loadConversation(selectedConversationId, Boolean(cached));
  }, [clearConversation, loadConversation, selectedConversationId]);

  useEffect(() => {
    if (!conversation || !selectedConversationId) {
      return;
    }

    setCachedConversationDetail(selectedConversationId, {
      conversation,
      channelConnected,
      aiEnabled,
      cannedResponses,
    });
  }, [
    aiEnabled,
    cannedResponses,
    channelConnected,
    conversation,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!selectedConversationId || !conversation?.channel) {
      return;
    }

    void refreshCannedResponses(conversation.channel);
  }, [conversation?.channel, refreshCannedResponses, selectedConversationId]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible" || !conversation?.channel) {
        return;
      }

      void refreshCannedResponses(conversation.channel);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversation?.channel, refreshCannedResponses]);

  return {
    selectedConversationId,
    selectConversation,
    conversation,
    channelConnected,
    aiEnabled,
    cannedResponses,
    isLoadingConversation,
    isLoadingOlderMessages,
    loadOlderMessages,
    refreshConversation,
    markConversationViewed,
    updateReadProgress,
    appendMessage,
    removeMessage,
    reconcileMessage,
    updateMessage,
    isClientTyping,
    refreshCannedResponses,
    syncConversationReadNow,
  };
}
