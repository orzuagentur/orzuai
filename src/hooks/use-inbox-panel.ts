"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  INBOX_LIST_POLL_FALLBACK_INTERVAL_MS,
  useInboxListPolling,
} from "@/hooks/use-inbox-list-polling";
import { useInboxListRealtime } from "@/hooks/use-inbox-list-realtime";
import { useInboxActiveConversation } from "@/hooks/use-inbox-active-conversation";
import type { ChatChannelId } from "@/features/chats";
import type {
  ConversationDetail,
  ConversationListItem,
} from "@/types/chat.types";
import type { CannedResponseItem } from "@/types/canned-response.types";
import { markConversationListItemRead } from "@/utils/conversation-unread";

type UseInboxPanelOptions = {
  initialConversationId: string | null;
  initialActiveConversation?: ConversationDetail | null;
  initialChannelConnected?: boolean;
  initialAiEnabled?: boolean | null;
  initialCannedResponses?: CannedResponseItem[];
  hasBusiness: boolean;
  businessId: string | null;
  isInitialLoading: boolean;
  channelFilter?: ChatChannelId;
  hasActiveListFilters: boolean;
  onConversationsChange: React.Dispatch<
    React.SetStateAction<ConversationListItem[]>
  >;
  onNeedsAttentionChange?: React.Dispatch<
    React.SetStateAction<ConversationListItem[]>
  >;
  onRefreshConversations: () => void;
};

export function useDebouncedInboxSearch(delayMs = 350) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
  };
}

export function useInboxPanel({
  initialConversationId,
  initialActiveConversation = null,
  initialChannelConnected = false,
  initialAiEnabled = null,
  initialCannedResponses = [],
  hasBusiness,
  businessId,
  isInitialLoading,
  channelFilter,
  hasActiveListFilters,
  onConversationsChange,
  onNeedsAttentionChange,
  onRefreshConversations,
}: UseInboxPanelOptions) {
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [draft, setDraft] = useState("");
  const [suggestReplyOpen, setSuggestReplyOpen] = useState(false);

  const activeConversation = useInboxActiveConversation({
    initialConversationId,
    initialConversation: initialActiveConversation,
    initialChannelConnected,
    initialAiEnabled,
    initialCannedResponses,
  });

  const markConversationReadInLists = useCallback(
    (conversationId: string) => {
      onConversationsChange((current) =>
        markConversationListItemRead(current, conversationId),
      );
      onNeedsAttentionChange?.((current) =>
        markConversationListItemRead(current, conversationId),
      );
    },
    [onConversationsChange, onNeedsAttentionChange],
  );

  const handleConversationSelect = useCallback(
    (conversationId: string | null) => {
      activeConversation.selectConversation(conversationId);

      if (!conversationId) {
        return;
      }

      markConversationReadInLists(conversationId);
    },
    [activeConversation, markConversationReadInLists],
  );

  useInboxListRealtime({
    enabled: hasBusiness && !isInitialLoading,
    businessId,
    channelFilter,
    selectedConversationId: activeConversation.selectedConversationId,
    hasActiveFilters: hasActiveListFilters,
    onConnectionChange: setRealtimeConnected,
    onConversationsChange,
    onNeedsAttentionChange,
    onRefresh: onRefreshConversations,
  });

  useInboxListPolling(
    () => {
      if (!isInitialLoading) {
        onRefreshConversations();
      }
    },
    {
      enabled: hasBusiness && !isInitialLoading && !realtimeConnected,
      intervalMs: INBOX_LIST_POLL_FALLBACK_INTERVAL_MS,
    },
  );

  return {
    realtimeConnected,
    draft,
    setDraft,
    suggestReplyOpen,
    setSuggestReplyOpen,
    handleConversationSelect,
    ...activeConversation,
  };
}

export function useSkipInitialListFetch() {
  const skipInitialFetchRef = useRef(true);

  const consumeSkipInitialFetch = useCallback(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return true;
    }

    return false;
  }, []);

  return { consumeSkipInitialFetch };
}
