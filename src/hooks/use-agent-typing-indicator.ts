"use client";

import { useEffect, useRef } from "react";

import { sendAgentTypingAction } from "@/features/chats/actions/send-agent-typing";
import { createClientIfConfigured } from "@/lib/supabase/client";
import {
  CONVERSATION_TYPING_EVENT,
  getConversationRealtimeChannelName,
} from "@/lib/realtime/conversation-channel";

const IDLE_TYPING_MS = 2_500;
const CHANNEL_TYPING_THROTTLE_MS = 4_000;

type UseAgentTypingIndicatorOptions = {
  conversationId: string | null;
  draft: string;
  enabled?: boolean;
};

export function useAgentTypingIndicator({
  conversationId,
  draft,
  enabled = true,
}: UseAgentTypingIndicatorOptions) {
  const idleTimeoutRef = useRef<number | null>(null);
  const channelThrottleRef = useRef<number | null>(null);
  const lastChannelTypingAtRef = useRef(0);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !enabled) {
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    const channelName = getConversationRealtimeChannelName(conversationId);

    const broadcastAgentTyping = async (isTyping: boolean) => {
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });

      await new Promise<void>((resolve) => {
        let settled = false;

        const finish = () => {
          if (settled) {
            return;
          }

          settled = true;
          void supabase.removeChannel(channel);
          resolve();
        };

        const timeoutId = window.setTimeout(finish, 2_000);

        channel.subscribe(async (status) => {
          if (status !== "SUBSCRIBED") {
            return;
          }

          await channel.send({
            type: "broadcast",
            event: CONVERSATION_TYPING_EVENT,
            payload: {
              sender: "agent",
              isTyping,
              at: Date.now(),
            },
          });

          window.clearTimeout(timeoutId);
          finish();
        });
      });
    };

    const stopTyping = () => {
      if (!isTypingRef.current) {
        return;
      }

      isTypingRef.current = false;
      void broadcastAgentTyping(false);
    };

    const clearIdleTimeout = () => {
      if (idleTimeoutRef.current !== null) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    };

    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      clearIdleTimeout();
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      void broadcastAgentTyping(true);
    }

    const now = Date.now();

    if (now - lastChannelTypingAtRef.current >= CHANNEL_TYPING_THROTTLE_MS) {
      lastChannelTypingAtRef.current = now;
      void sendAgentTypingAction(conversationId);
    }

    clearIdleTimeout();
    idleTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, IDLE_TYPING_MS);

    return () => {
      clearIdleTimeout();

      if (channelThrottleRef.current !== null) {
        window.clearTimeout(channelThrottleRef.current);
        channelThrottleRef.current = null;
      }
    };
  }, [conversationId, draft, enabled]);

  useEffect(() => {
    if (!draft.trim()) {
      isTypingRef.current = false;
    }
  }, [draft]);
}
