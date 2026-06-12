"use client";

import { useEffect, useRef } from "react";

import { fetchNewConversationMessagesAction } from "@/features/chats/actions/fetch-new-conversation-messages";
import { fetchRecentConversationMessagesAction } from "@/features/chats/actions/fetch-recent-conversation-messages";
import type { ChatMessageData } from "@/types/chat.types";

export const ACTIVE_CONVERSATION_POLL_MS = 3_000;

type UseActiveConversationPollingOptions = {
  conversationId: string | null;
  latestMessageAt: string | null;
  enabled?: boolean;
  intervalMs?: number;
  onNewMessages: (messages: ChatMessageData[]) => void;
  onSyncMessages?: (messages: ChatMessageData[]) => void;
};

export function useActiveConversationPolling({
  conversationId,
  latestMessageAt,
  enabled = true,
  intervalMs = ACTIVE_CONVERSATION_POLL_MS,
  onNewMessages,
  onSyncMessages,
}: UseActiveConversationPollingOptions) {
  const latestMessageAtRef = useRef(latestMessageAt);
  const onNewMessagesRef = useRef(onNewMessages);
  const onSyncMessagesRef = useRef(onSyncMessages);
  const isPollingRef = useRef(false);

  latestMessageAtRef.current = latestMessageAt;
  onNewMessagesRef.current = onNewMessages;
  onSyncMessagesRef.current = onSyncMessages;

  useEffect(() => {
    if (!enabled || !conversationId) {
      return;
    }

    const tick = async () => {
      if (
        document.visibilityState !== "visible" ||
        isPollingRef.current ||
        !latestMessageAtRef.current
      ) {
        return;
      }

      isPollingRef.current = true;

      try {
        const result = await fetchNewConversationMessagesAction({
          conversationId,
          afterCreatedAt: latestMessageAtRef.current,
        });

        if (result.success && result.data.messages.length > 0) {
          onNewMessagesRef.current(result.data.messages);
        }

        if (onSyncMessagesRef.current) {
          const syncResult = await fetchRecentConversationMessagesAction({
            conversationId,
            limit: 20,
          });

          if (syncResult.success && syncResult.data.messages.length > 0) {
            onSyncMessagesRef.current(syncResult.data.messages);
          }
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [conversationId, enabled, intervalMs]);
}
