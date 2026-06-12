"use client";

import { useEffect, useRef, useState } from "react";

import { createClientIfConfigured } from "@/lib/supabase/client";
import {
  bindSupabaseRealtimeAuthRefresh,
  waitForSupabaseRealtime,
} from "@/lib/supabase/realtime-auth";
import {
  CONVERSATION_TYPING_EVENT,
  getConversationRealtimeChannelName,
  type ConversationTypingPayload,
} from "@/lib/realtime/conversation-channel";
import type { ChatMessageData } from "@/types/chat.types";
import type { MessageSenderType, MessagingChannel } from "@/types/database.types";
import { mapChatMessage } from "@/utils/chat";

const CLIENT_TYPING_TIMEOUT_MS = 4_000;

type UseConversationRealtimeOptions = {
  conversationId: string | null;
  onMessage?: (message: ChatMessageData) => void;
  onMessageUpdated?: (message: ChatMessageData) => void;
  onMessageHidden?: (messageId: string) => void;
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

export function useConversationRealtime({
  conversationId,
  onMessage,
  onMessageUpdated,
  onMessageHidden,
}: UseConversationRealtimeOptions) {
  const [isClientTyping, setIsClientTyping] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const onMessageRef = useRef(onMessage);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onMessageHiddenRef = useRef(onMessageHidden);
  const typingTimeoutRef = useRef<number | null>(null);
  onMessageRef.current = onMessage;
  onMessageUpdatedRef.current = onMessageUpdated;
  onMessageHiddenRef.current = onMessageHidden;

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
      setIsRealtimeConnected(false);
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    const channelName = getConversationRealtimeChannelName(conversationId);
    let unbindAuthRefresh: (() => void) | null = null;
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

      unbindAuthRefresh = bindSupabaseRealtimeAuthRefresh(supabase);

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

            if (row.sender_type === "client") {
              clearTypingTimeout();
              setIsClientTyping(false);
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

            onMessageUpdatedRef.current?.(mapChatMessage(row));
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
        .subscribe((status) => {
          setIsRealtimeConnected(status === "SUBSCRIBED");

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
      setIsClientTyping(false);
      setIsRealtimeConnected(false);
      unbindAuthRefresh?.();

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [conversationId, reconnectNonce]);

  return { isClientTyping, isRealtimeConnected };
}
