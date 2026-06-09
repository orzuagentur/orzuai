"use client";

import { useEffect, useRef, useState } from "react";

import { createClientIfConfigured } from "@/lib/supabase/client";
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
};

type RealtimeMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: MessageSenderType;
  content: string;
  ai_generated: boolean;
  created_at: string;
};

export function useConversationRealtime({
  conversationId,
  onMessage,
}: UseConversationRealtimeOptions) {
  const [isClientTyping, setIsClientTyping] = useState(false);
  const onMessageRef = useRef(onMessage);
  const typingTimeoutRef = useRef<number | null>(null);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!conversationId) {
      setIsClientTyping(false);
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    const channelName = getConversationRealtimeChannelName(conversationId);

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

    const channel = supabase
      .channel(channelName, {
        config: { broadcast: { self: false } },
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
          const message = mapChatMessage(row);
          onMessageRef.current?.(message);

          if (row.sender_type === "client") {
            clearTypingTimeout();
            setIsClientTyping(false);
          }
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
      .subscribe();

    return () => {
      clearTypingTimeout();
      setIsClientTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { isClientTyping };
}
