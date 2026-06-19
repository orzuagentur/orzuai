"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  INBOX_LIST_POLL_FALLBACK_INTERVAL_MS,
  useInboxListPolling,
} from "@/hooks/use-inbox-list-polling";
import { useInboxListRealtime } from "@/hooks/use-inbox-list-realtime";
import { useInboxActiveConversation } from "@/hooks/use-inbox-active-conversation";
import { useOptionalDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";
import type { ChatChannelId } from "@/features/chats";
import type {
  ConversationDetail,
  ConversationListItem,
} from "@/types/chat.types";
import type { CannedResponseItem } from "@/types/canned-response.types";
import type { MessagingChannel } from "@/types/database.types";
import {
  countUnreadClientMessages,
  markConversationListItemRead,
  preserveLocallyReadConversations,
} from "@/utils/conversation-unread";

const LOCALLY_READ_TTL_MS = 60_000;

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

function getConversationUnreadCount(
  conversations: ConversationListItem[],
  conversationId: string,
): number {
  const conversation = conversations.find((item) => item.id === conversationId);

  if (!conversation) {
    return 0;
  }

  if (conversation.unreadMessageCount > 0) {
    return conversation.unreadMessageCount;
  }

  return conversation.isUnread ? 1 : 0;
}

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
  const locallyReadConversationIdsRef = useRef<Map<string, number>>(new Map());
  const navBadges = useOptionalDashboardNavBadges();

  const activeConversation = useInboxActiveConversation({
    initialConversationId,
    initialConversation: initialActiveConversation,
    initialChannelConnected,
    initialAiEnabled,
    initialCannedResponses,
  });

  const rememberLocallyReadConversation = useCallback((conversationId: string) => {
    locallyReadConversationIdsRef.current.set(conversationId, Date.now());

    for (const [id, readAt] of locallyReadConversationIdsRef.current.entries()) {
      if (Date.now() - readAt > LOCALLY_READ_TTL_MS) {
        locallyReadConversationIdsRef.current.delete(id);
      }
    }
  }, []);

  const clearConversationUnread = useCallback(
    (conversationId: string) => {
      let clearedUnreadCount = 0;
      let clearedChannel: MessagingChannel | null = null;

      onConversationsChange((current) => {
        clearedUnreadCount = getConversationUnreadCount(current, conversationId);
        const conversation = current.find((item) => item.id === conversationId);
        clearedChannel = conversation?.channel ?? null;
        rememberLocallyReadConversation(conversationId);
        return markConversationListItemRead(current, conversationId);
      });

      onNeedsAttentionChange?.((current) => {
        rememberLocallyReadConversation(conversationId);
        return markConversationListItemRead(current, conversationId);
      });

      if (clearedUnreadCount > 0 && clearedChannel && navBadges) {
        navBadges.markConversationReadOptimistic({
          channel: clearedChannel,
          unreadCount: clearedUnreadCount,
        });
      }
    },
    [
      navBadges,
      onConversationsChange,
      onNeedsAttentionChange,
      rememberLocallyReadConversation,
    ],
  );

  const preserveListReadState = useCallback(
    (conversations: ConversationListItem[]) =>
      preserveLocallyReadConversations(
        conversations,
        new Set(locallyReadConversationIdsRef.current.keys()),
        activeConversation.selectedConversationId,
      ),
    [activeConversation.selectedConversationId],
  );

  const handleConversationSelect = useCallback(
    (conversationId: string | null) => {
      activeConversation.selectConversation(conversationId);

      if (!conversationId) {
        return;
      }

      clearConversationUnread(conversationId);
    },
    [activeConversation, clearConversationUnread],
  );

  const handleConversationViewed = useCallback(() => {
    if (!activeConversation.selectedConversationId) {
      return;
    }

    clearConversationUnread(activeConversation.selectedConversationId);
    activeConversation.markConversationViewed();
  }, [
    activeConversation.markConversationViewed,
    activeConversation.selectedConversationId,
    clearConversationUnread,
  ]);

  const handleReadProgress = useCallback(
    (readAt: string) => {
      const conversation = activeConversation.conversation;
      const conversationId = activeConversation.selectedConversationId;

      if (!conversation || !conversationId) {
        return;
      }

      if (
        conversation.lastReadAt &&
        new Date(readAt).getTime() <= new Date(conversation.lastReadAt).getTime()
      ) {
        return;
      }

      activeConversation.updateReadProgress(readAt);
      clearConversationUnread(conversationId);

      const remainingUnread = countUnreadClientMessages(
        conversation.messages,
        readAt,
      );

      if (remainingUnread === 0) {
        activeConversation.markConversationViewed();
      }
    },
    [
      activeConversation.conversation,
      activeConversation.markConversationViewed,
      activeConversation.selectedConversationId,
      activeConversation.updateReadProgress,
      clearConversationUnread,
    ],
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
    handleConversationViewed,
    handleReadProgress,
    preserveListReadState,
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
