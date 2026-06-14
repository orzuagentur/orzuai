"use client";

import { useEffect, useRef } from "react";

import { fetchNewConversationMessagesAction } from "@/features/chats/actions/fetch-new-conversation-messages";
import { fetchRecentConversationMessagesAction } from "@/features/chats/actions/fetch-recent-conversation-messages";
import type { ChatMessageData } from "@/types/chat.types";

export const ACTIVE_CONVERSATION_POLL_MS = 5_000;

type UseActiveConversationPollingOptions = {
  conversationId: string | null;
  latestMessageAt: string | null;
  latestMessageId?: string | null;
  /** Polling runs only when enabled (typically realtime fallback). */
  enabled?: boolean;
  /** Fetch messages newer than the tail cursor. */
  pollNewMessages?: boolean;
  /** Refresh recent tail to pick up missed content updates while disconnected. */
  syncRecentMessages?: boolean;
  intervalMs?: number;
  onNewMessages: (messages: ChatMessageData[]) => void;
  onSyncMessages?: (messages: ChatMessageData[]) => void;
};

export function useActiveConversationPolling({
  conversationId,
  latestMessageAt,
  latestMessageId = null,
  enabled = true,
  pollNewMessages = true,
  syncRecentMessages = true,
  intervalMs = ACTIVE_CONVERSATION_POLL_MS,
  onNewMessages,
  onSyncMessages,
}: UseActiveConversationPollingOptions) {
  const latestMessageAtRef = useRef(latestMessageAt);
  const latestMessageIdRef = useRef(latestMessageId);
  const onNewMessagesRef = useRef(onNewMessages);
  const onSyncMessagesRef = useRef(onSyncMessages);
  const isPollingRef = useRef(false);

  latestMessageAtRef.current = latestMessageAt;
  latestMessageIdRef.current = latestMessageId;
  onNewMessagesRef.current = onNewMessages;
  onSyncMessagesRef.current = onSyncMessages;

  useEffect(() => {
    const shouldPollNewMessages = enabled && pollNewMessages;
    const shouldSyncRecentMessages =
      enabled && syncRecentMessages && Boolean(onSyncMessages);

    if (!conversationId || (!shouldPollNewMessages && !shouldSyncRecentMessages)) {
      return;
    }

    const tick = async () => {
      if (document.visibilityState !== "visible" || isPollingRef.current) {
        return;
      }

      if (shouldPollNewMessages && !latestMessageAtRef.current) {
        return;
      }

      isPollingRef.current = true;

      try {
        if (shouldPollNewMessages && latestMessageAtRef.current) {
          const result = await fetchNewConversationMessagesAction({
            conversationId,
            afterCreatedAt: latestMessageAtRef.current,
            afterMessageId: latestMessageIdRef.current ?? undefined,
          });

          if (result.success && result.data.messages.length > 0) {
            onNewMessagesRef.current(result.data.messages);
          }
        }

        if (shouldSyncRecentMessages && onSyncMessagesRef.current) {
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
  }, [
    conversationId,
    enabled,
    intervalMs,
    latestMessageId,
    onSyncMessages,
    pollNewMessages,
    syncRecentMessages,
  ]);
}
