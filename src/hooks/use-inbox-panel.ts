"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  INBOX_LIST_POLL_FALLBACK_INTERVAL_MS,
  useInboxListPolling,
} from "@/hooks/use-inbox-list-polling";
import { useInboxListRealtime } from "@/hooks/use-inbox-list-realtime";
import { useInboxActiveConversation } from "@/hooks/use-inbox-active-conversation";
import { useOptionalDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";
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

const LOCALLY_READ_TTL_MS = 300_000;

type UseInboxPanelOptions = {
  initialConversationId: string | null;
  initialActiveConversation?: ConversationDetail | null;
  initialChannelConnected?: boolean;
  initialAiEnabled?: boolean | null;
  initialCannedResponses?: CannedResponseItem[];
  hasBusiness: boolean;
  businessId: string | null;
  isInitialLoading: boolean;
  channelFilter?: MessagingChannel;
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

function isConversationMarkedUnread(
  conversation: ConversationListItem,
): boolean {
  return conversation.unreadMessageCount > 0 || conversation.isUnread;
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
  const syncedReadConversationIdRef = useRef<string | null>(null);
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
      let didChangeList = false;

      onConversationsChange((current) => {
        const conversation = current.find((item) => item.id === conversationId);

        if (!conversation || !isConversationMarkedUnread(conversation)) {
          return current;
        }

        clearedUnreadCount = getConversationUnreadCount(current, conversationId);
        clearedChannel = conversation.channel;
        didChangeList = true;
        rememberLocallyReadConversation(conversationId);
        return markConversationListItemRead(current, conversationId);
      });

      onNeedsAttentionChange?.((current) => {
        const conversation = current.find((item) => item.id === conversationId);

        if (!conversation || !isConversationMarkedUnread(conversation)) {
          return current;
        }

        rememberLocallyReadConversation(conversationId);
        didChangeList = true;
        return markConversationListItemRead(current, conversationId);
      });

      if (!didChangeList) {
        return;
      }

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

  const {
    selectedConversationId,
    conversation: activeConversationDetail,
    selectConversation,
    syncConversationReadNow,
    markConversationViewed,
    updateReadProgress,
    ...activeConversationRest
  } = activeConversation;

  const preserveListReadState = useCallback(
    (conversations: ConversationListItem[]) =>
      preserveLocallyReadConversations(
        conversations,
        new Set(locallyReadConversationIdsRef.current.keys()),
        selectedConversationId,
      ),
    [selectedConversationId],
  );

  const handleConversationSelect = useCallback(
    (conversationId: string | null) => {
      syncedReadConversationIdRef.current = null;
      selectConversation(conversationId);

      if (!conversationId) {
        return;
      }

      clearConversationUnread(conversationId);

      void syncConversationReadNow(conversationId).then((success) => {
        if (success) {
          syncedReadConversationIdRef.current = conversationId;
          void navBadges?.refresh({ force: true });
        }
      });
    },
    [clearConversationUnread, navBadges, selectConversation, syncConversationReadNow],
  );

  useEffect(() => {
    if (!selectedConversationId) {
      syncedReadConversationIdRef.current = null;
      return;
    }

    if (!activeConversationDetail) {
      return;
    }

    if (syncedReadConversationIdRef.current === selectedConversationId) {
      return;
    }

    syncedReadConversationIdRef.current = selectedConversationId;
    clearConversationUnread(selectedConversationId);

    void syncConversationReadNow(selectedConversationId).then((success) => {
      if (success) {
        void navBadges?.refresh({ force: true });
      }
    });
  }, [
    activeConversationDetail?.id,
    clearConversationUnread,
    navBadges,
    selectedConversationId,
    syncConversationReadNow,
  ]);

  const handleConversationViewed = useCallback(() => {
    if (!selectedConversationId) {
      return;
    }

    clearConversationUnread(selectedConversationId);
    markConversationViewed();
  }, [clearConversationUnread, markConversationViewed, selectedConversationId]);

  const handleReadProgress = useCallback(
    (readAt: string) => {
      if (!activeConversationDetail || !selectedConversationId) {
        return;
      }

      if (
        activeConversationDetail.lastReadAt &&
        new Date(readAt).getTime() <=
          new Date(activeConversationDetail.lastReadAt).getTime()
      ) {
        return;
      }

      updateReadProgress(readAt);
      clearConversationUnread(selectedConversationId);

      const remainingUnread = countUnreadClientMessages(
        activeConversationDetail.messages,
        readAt,
      );

      if (remainingUnread === 0) {
        markConversationViewed();
      }
    },
    [
      activeConversationDetail,
      clearConversationUnread,
      markConversationViewed,
      selectedConversationId,
      updateReadProgress,
    ],
  );

  useInboxListRealtime({
    enabled: hasBusiness && !isInitialLoading,
    businessId,
    channelFilter,
    selectedConversationId,
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
    selectedConversationId,
    conversation: activeConversationDetail,
    selectConversation,
    ...activeConversationRest,
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
