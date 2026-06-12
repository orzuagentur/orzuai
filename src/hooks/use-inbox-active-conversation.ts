"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchConversationDetailAction } from "@/features/chats/actions/fetch-conversation-detail";
import { fetchOlderConversationMessagesAction } from "@/features/chats/actions/fetch-older-conversation-messages";
import { useActiveConversationPolling } from "@/hooks/use-active-conversation-polling";
import { useConversationRealtime } from "@/hooks/use-conversation-realtime";
import {
  getCachedMediaUrl,
  isConversationDetailFresh,
  peekCachedConversationDetail,
  setCachedConversationDetail,
} from "@/lib/client-cache/inbox-messenger-cache";
import { revokeOptimisticMediaContent } from "@/utils/optimistic-chat-message";
import {
  buildMediaUrlCacheKey,
  encodeMediaMessage,
  parseMediaMessage,
} from "@/utils/chat-media";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ChatMessageData, ConversationDetail } from "@/types/chat.types";

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
  selectedConversationIdRef.current = selectedConversationId;

  const clearConversation = useCallback(() => {
    setConversation(null);
    setChannelConnected(false);
    setAiEnabled(null);
    setCannedResponses([]);
    setIsLoadingConversation(false);
    setIsLoadingOlderMessages(false);
  }, []);

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
        if (current.messages.some((item) => item.id === message.id)) {
          return current;
        }

        return {
          ...current,
          messages: [...current.messages, message],
          totalMessageCount: current.totalMessageCount + 1,
          updatedAt: message.editedAt ?? message.createdAt,
        };
      }

      if (current.messages[index]?.content === message.content) {
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

  const appendMessageRef = useRef(appendMessage);
  const updateMessageRef = useRef(updateMessage);
  const removeMessageRef = useRef(removeMessage);
  appendMessageRef.current = appendMessage;
  updateMessageRef.current = updateMessage;
  removeMessageRef.current = removeMessage;

  const { isClientTyping, isRealtimeConnected } = useConversationRealtime({
    conversationId: selectedConversationId,
    onMessage: (message) => {
      appendMessageRef.current(message);
    },
    onMessageUpdated: (message) => {
      updateMessageRef.current(message);
    },
    onMessageHidden: (messageId) => {
      removeMessageRef.current(messageId);
    },
  });

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

  useActiveConversationPolling({
    conversationId: selectedConversationId,
    latestMessageAt,
    latestMessageId,
    enabled:
      Boolean(selectedConversationId && conversation) && !isRealtimeConnected,
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
    appendMessage,
    removeMessage,
    reconcileMessage,
    updateMessage,
    isClientTyping,
  };
}
