"use client";

import { useEffect, useRef } from "react";

import { sendAgentTypingAction } from "@/features/chats/actions/send-agent-typing";

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
  const lastChannelTypingAtRef = useRef(0);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !enabled) {
      return;
    }

    const clearIdleTimeout = () => {
      if (idleTimeoutRef.current !== null) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    };

    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      clearIdleTimeout();
      isTypingRef.current = false;
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
    }

    const now = Date.now();

    if (now - lastChannelTypingAtRef.current >= CHANNEL_TYPING_THROTTLE_MS) {
      lastChannelTypingAtRef.current = now;
      void sendAgentTypingAction(conversationId);
    }

    clearIdleTimeout();
    idleTimeoutRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
    }, IDLE_TYPING_MS);

    return () => {
      clearIdleTimeout();
    };
  }, [conversationId, draft, enabled]);

  useEffect(() => {
    if (!draft.trim()) {
      isTypingRef.current = false;
    }
  }, [draft]);
}
