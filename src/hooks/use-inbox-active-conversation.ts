"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchConversationDetailAction } from "@/features/chats/actions/fetch-conversation-detail";
import { fetchOlderConversationMessagesAction } from "@/features/chats/actions/fetch-older-conversation-messages";
import { useConversationRealtime } from "@/hooks/use-conversation-realtime";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { ChatMessageData, ConversationDetail } from "@/types/chat.types";

type UseInboxActiveConversationOptions = {
  initialConversationId: string | null;
  initialConversation: ConversationDetail | null;
  initialChannelConnected: boolean;
  initialAiEnabled: boolean | null;
  initialCannedResponses: CannedResponseItem[];
};

export function useInboxActiveConversation({
  initialConversationId,
  initialConversation,
  initialChannelConnected,
  initialAiEnabled,
  initialCannedResponses,
}: UseInboxActiveConversationOptions) {
  const [selectedConversationId, setSelectedConversationId] = useState(
    initialConversationId,
  );
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    initialConversation,
  );
  const [channelConnected, setChannelConnected] = useState(
    initialChannelConnected,
  );
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(initialAiEnabled);
  const [cannedResponses, setCannedResponses] = useState(
    initialCannedResponses,
  );
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const requestIdRef = useRef(0);
  const skipInitialLoadRef = useRef(
    Boolean(
      initialConversation &&
        initialConversationId &&
        initialConversation.id === initialConversationId,
    ),
  );
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

      return {
        ...current,
        messages: [...current.messages, message],
        totalMessageCount: current.totalMessageCount + 1,
        updatedAt: message.createdAt,
      };
    });
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setConversation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        messages: current.messages.filter((item) => item.id !== messageId),
        totalMessageCount: Math.max(0, current.totalMessageCount - 1),
      };
    });
  }, []);

  const appendMessageRef = useRef(appendMessage);
  appendMessageRef.current = appendMessage;

  const { isClientTyping } = useConversationRealtime({
    conversationId: selectedConversationId,
    onMessage: (message) => {
      appendMessageRef.current(message);
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

    if (skipInitialLoadRef.current) {
      skipInitialLoadRef.current = false;
      return;
    }

    void loadConversation(selectedConversationId);
  }, [clearConversation, loadConversation, selectedConversationId]);

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
    isClientTyping,
  };
}
