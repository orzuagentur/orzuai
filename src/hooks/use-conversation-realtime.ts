"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requestConversationGapSyncWithRetry } from "@/lib/client/conversation-gap-sync";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import {
  CONVERSATION_AUTO_REPLY_STATUS_EVENT,
  CONVERSATION_MESSAGE_UPDATED_EVENT,
  CONVERSATION_TYPING_EVENT,
  getConversationRealtimeChannelName,
  type AutoReplyStatusPayload,
  type ConversationDeliveryStatusPayload,
  type ConversationGapSyncPayload,
  type ConversationMessageUpdatedPayload,
  type ConversationReconnectCursor,
  type ConversationTypingPayload,
} from "@/lib/realtime/conversation-channel";
import type { ChatMessageData } from "@/types/chat.types";
import type {
  MessageDeliveryStatus,
  MessageSenderType,
  MessagingChannel,
} from "@/types/database.types";
import { mapChatMessage } from "@/utils/chat";

const CLIENT_TYPING_TIMEOUT_MS = 4_000;
const REPLY_TYPING_TIMEOUT_MS = 90_000;

export type AutoReplyInboxError = {
  code: string;
  message: string;
};

type UseConversationRealtimeOptions = {
  conversationId: string | null;
  reconnectCursor?: ConversationReconnectCursor | null;
  getReconnectCursor?: () => ConversationReconnectCursor | null;
  onMessage?: (message: ChatMessageData) => void;
  onMessageUpdated?: (message: ChatMessageData) => void;
  onDeliveryStatusUpdated?: (
    payload: ConversationDeliveryStatusPayload,
  ) => void;
  onMessageHidden?: (messageId: string) => void;
  onGapSync?: (payload: ConversationGapSyncPayload) => void;
  onReconnectCursorChange?: (cursor: ConversationReconnectCursor) => void;
};

type RealtimeMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: MessageSenderType;
  content: string;
  ai_generated: boolean;
  created_at: string;
  deleted_for_all_at?: string | null;
  hidden_for_business?: boolean;
  edited_at?: string | null;
  is_edited?: boolean;
};

function toReconnectCursor(message: ChatMessageData): ConversationReconnectCursor {
  return {
    afterCreatedAt: message.sentAt,
    afterMessageId: message.id,
  };
}

type RealtimeDeliveryRow = {
  message_id: string;
  conversation_id: string | null;
  status: MessageDeliveryStatus;
};

export function useConversationRealtime({
  conversationId,
  reconnectCursor = null,
  getReconnectCursor,
  onMessage,
  onMessageUpdated,
  onDeliveryStatusUpdated,
  onMessageHidden,
  onGapSync,
  onReconnectCursorChange,
}: UseConversationRealtimeOptions) {
  const [isClientTyping, setIsClientTyping] = useState(false);
  const [isReplyTyping, setIsReplyTyping] = useState(false);
  const [autoReplyError, setAutoReplyError] = useState<AutoReplyInboxError | null>(
    null,
  );
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const onMessageRef = useRef(onMessage);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onDeliveryStatusUpdatedRef = useRef(onDeliveryStatusUpdated);
  const onMessageHiddenRef = useRef(onMessageHidden);
  const onGapSyncRef = useRef(onGapSync);
  const getReconnectCursorRef = useRef(getReconnectCursor);
  const onReconnectCursorChangeRef = useRef(onReconnectCursorChange);
  const gapSyncInFlightRef = useRef(false);
  const gapSyncPendingRef = useRef(false);
  const isSubscribedRef = useRef(false);
  const reconnectCursorPropRef = useRef(reconnectCursor);
  const typingTimeoutRef = useRef<number | null>(null);
  const replyTypingTimeoutRef = useRef<number | null>(null);
  onMessageRef.current = onMessage;
  onMessageUpdatedRef.current = onMessageUpdated;
  onDeliveryStatusUpdatedRef.current = onDeliveryStatusUpdated;
  onMessageHiddenRef.current = onMessageHidden;
  onGapSyncRef.current = onGapSync;
  getReconnectCursorRef.current = getReconnectCursor;
  onReconnectCursorChangeRef.current = onReconnectCursorChange;
  reconnectCursorPropRef.current = reconnectCursor;

  const dismissAutoReplyError = useCallback(() => {
    setAutoReplyError(null);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setReconnectNonce((current) => current + 1);
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setIsClientTyping(false);
      setIsReplyTyping(false);
      setAutoReplyError(null);
      setIsRealtimeConnected(false);
      gapSyncPendingRef.current = false;
      isSubscribedRef.current = false;
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    const channelName = getConversationRealtimeChannelName(conversationId);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const clearTypingTimeout = () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };

    const scheduleTypingClear = () => {
      clearTypingTimeout();
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsClientTyping(false);
      }, CLIENT_TYPING_TIMEOUT_MS);
    };

    const clearReplyTypingTimeout = () => {
      if (replyTypingTimeoutRef.current !== null) {
        window.clearTimeout(replyTypingTimeoutRef.current);
        replyTypingTimeoutRef.current = null;
      }
    };

    const scheduleReplyTypingClear = () => {
      clearReplyTypingTimeout();
      replyTypingTimeoutRef.current = window.setTimeout(() => {
        setIsReplyTyping(false);
      }, REPLY_TYPING_TIMEOUT_MS);
    };

    const resolveCursor = (): ConversationReconnectCursor | null => {
      return (
        getReconnectCursorRef.current?.() ??
        reconnectCursorPropRef.current ??
        null
      );
    };

    const runGapSync = async () => {
      const cursor = resolveCursor();

      if (!cursor) {
        if (isSubscribedRef.current) {
          gapSyncPendingRef.current = true;
        }
        return;
      }

      if (!onGapSyncRef.current || gapSyncInFlightRef.current) {
        return;
      }

      gapSyncInFlightRef.current = true;

      try {
        const result = await requestConversationGapSyncWithRetry(
          conversationId,
          cursor,
        );

        if (!result.success) {
          return;
        }

        gapSyncPendingRef.current = false;
        onGapSyncRef.current({
          newMessages: result.newMessages,
          recentMessages: result.recentMessages,
          cursor: result.cursor,
        });
        onReconnectCursorChangeRef.current?.(result.cursor);
      } finally {
        gapSyncInFlightRef.current = false;
      }
    };

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled) {
        return;
      }

      if (!authed) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[realtime] conversation skipped — no authenticated session (${conversationId})`,
          );
        }
        return;
      }

      if (cancelled) {
        return;
      }

      channel = supabase
        .channel(channelName, {
          config: { broadcast: { self: true } },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as RealtimeMessageRow;

            if (row.hidden_for_business) {
              return;
            }

            const message = mapChatMessage(row);
            onMessageRef.current?.(message);
            onReconnectCursorChangeRef.current?.(toReconnectCursor(message));

            if (row.sender_type === "client") {
              clearTypingTimeout();
              setIsClientTyping(false);
            }

            if (row.sender_type === "ai" || row.ai_generated) {
              clearReplyTypingTimeout();
              setIsReplyTyping(false);
              setAutoReplyError(null);
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as RealtimeMessageRow;

            if (row.hidden_for_business) {
              onMessageHiddenRef.current?.(row.id);
              return;
            }

            const message = mapChatMessage(row);
            onMessageUpdatedRef.current?.(message);
            onReconnectCursorChangeRef.current?.(toReconnectCursor(message));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "message_deliveries",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as RealtimeDeliveryRow;

            if (!row.message_id || !row.status) {
              return;
            }

            onDeliveryStatusUpdatedRef.current?.({
              conversation_id: conversationId,
              message_id: row.message_id,
              status: row.status,
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message_deliveries",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as RealtimeDeliveryRow;

            if (!row.message_id || !row.status) {
              return;
            }

            onDeliveryStatusUpdatedRef.current?.({
              conversation_id: conversationId,
              message_id: row.message_id,
              status: row.status,
            });
          },
        )
        .on(
          "broadcast",
          { event: CONVERSATION_TYPING_EVENT },
          (payload) => {
            const event = payload.payload as ConversationTypingPayload;

            if (event.sender !== "client") {
              return;
            }

            if (event.isTyping) {
              setIsClientTyping(true);
              scheduleTypingClear();
              return;
            }

            clearTypingTimeout();
            setIsClientTyping(false);
          },
        )
        .on(
          "broadcast",
          { event: CONVERSATION_AUTO_REPLY_STATUS_EVENT },
          (payload) => {
            const event = payload.payload as AutoReplyStatusPayload;

            if (event.status === "typing") {
              setAutoReplyError(null);
              setIsReplyTyping(true);
              scheduleReplyTypingClear();
              return;
            }

            clearReplyTypingTimeout();
            setIsReplyTyping(false);

            if (event.status === "error") {
              setAutoReplyError({
                code: event.errorCode ?? "unknown",
                message:
                  event.errorMessage?.trim() ||
                  "Could not generate an automatic reply.",
              });
            }
          },
        )
        .on(
          "broadcast",
          { event: CONVERSATION_MESSAGE_UPDATED_EVENT },
          (payload) => {
            const row = payload.payload as ConversationMessageUpdatedPayload;

            if (row.hidden_for_business) {
              onMessageHiddenRef.current?.(row.id);
              return;
            }

            const message = {
              ...mapChatMessage(row),
              attachmentPending: row.attachment_pending ?? false,
              attachmentFailed: row.attachment_failed ?? false,
            };
            onMessageUpdatedRef.current?.(message);
            onReconnectCursorChangeRef.current?.(toReconnectCursor(message));
          },
        )
        .subscribe((status) => {
          const subscribed = status === "SUBSCRIBED";
          isSubscribedRef.current = subscribed;
          setIsRealtimeConnected(subscribed);

          if (subscribed) {
            void runGapSync();
          } else {
            gapSyncPendingRef.current = false;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            window.setTimeout(() => {
              setReconnectNonce((current) => current + 1);
            }, 2000);
          }

          if (
            process.env.NODE_ENV === "development" &&
            (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          ) {
            console.warn(
              `[realtime] conversation channel ${status} for ${conversationId}`,
            );
          }
        });
    })();

    return () => {
      cancelled = true;
      clearTypingTimeout();
      clearReplyTypingTimeout();
      setIsClientTyping(false);
      setIsReplyTyping(false);
      setIsRealtimeConnected(false);
      isSubscribedRef.current = false;
      gapSyncPendingRef.current = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [conversationId, reconnectNonce]);

  useEffect(() => {
    if (!conversationId || !reconnectCursor || !isSubscribedRef.current) {
      return;
    }

    if (!gapSyncPendingRef.current) {
      return;
    }

    void (async () => {
      const supabase = createClientIfConfigured();

      if (!supabase || gapSyncInFlightRef.current) {
        return;
      }

      const cursor = getReconnectCursorRef.current?.() ?? reconnectCursor;

      if (!cursor || !onGapSyncRef.current) {
        return;
      }

      gapSyncInFlightRef.current = true;

      try {
        const result = await requestConversationGapSyncWithRetry(
          conversationId,
          cursor,
        );

        if (!result.success) {
          return;
        }

        gapSyncPendingRef.current = false;
        onGapSyncRef.current({
          newMessages: result.newMessages,
          recentMessages: result.recentMessages,
          cursor: result.cursor,
        });
        onReconnectCursorChangeRef.current?.(result.cursor);
      } finally {
        gapSyncInFlightRef.current = false;
      }
    })();
  }, [conversationId, reconnectCursor]);

  return {
    isClientTyping,
    isReplyTyping,
    autoReplyError,
    dismissAutoReplyError,
    isRealtimeConnected,
  };
}
