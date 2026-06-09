"use client";

import { useEffect, useRef } from "react";

import { fetchConversationListItemAction } from "@/features/chats/actions/fetch-conversation-list-item";
import { createClientIfConfigured } from "@/lib/supabase/client";
import type { ConversationListItem } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import {
  applyRealtimeConversationUpdate,
  applyRealtimeMessageToList,
  prependConversationListItem,
  syncNeedsAttentionList,
  type InboxRealtimeConversationRow,
  type InboxRealtimeMessageRow,
} from "@/utils/inbox-list-realtime";

const REFRESH_DEBOUNCE_MS = 500;

type UseInboxListRealtimeOptions = {
  enabled?: boolean;
  channelFilter?: MessagingChannel;
  selectedConversationId: string | null;
  hasActiveFilters?: boolean;
  onConversationsChange: (
    updater: (current: ConversationListItem[]) => ConversationListItem[],
  ) => void;
  onNeedsAttentionChange?: (
    updater: (current: ConversationListItem[]) => ConversationListItem[],
  ) => void;
  onRefresh: () => void;
};

export function useInboxListRealtime({
  enabled = true,
  channelFilter,
  selectedConversationId,
  hasActiveFilters = false,
  onConversationsChange,
  onNeedsAttentionChange,
  onRefresh,
}: UseInboxListRealtimeOptions) {
  const onConversationsChangeRef = useRef(onConversationsChange);
  const onNeedsAttentionChangeRef = useRef(onNeedsAttentionChange);
  const onRefreshRef = useRef(onRefresh);
  const refreshTimeoutRef = useRef<number | null>(null);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const hasActiveFiltersRef = useRef(hasActiveFilters);

  onConversationsChangeRef.current = onConversationsChange;
  onNeedsAttentionChangeRef.current = onNeedsAttentionChange;
  onRefreshRef.current = onRefresh;
  selectedConversationIdRef.current = selectedConversationId;
  hasActiveFiltersRef.current = hasActiveFilters;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        onRefreshRef.current();
      }, REFRESH_DEBOUNCE_MS);
    };

    const applyListUpdates = (updatedItem: ConversationListItem | null) => {
      if (!updatedItem || !onNeedsAttentionChangeRef.current) {
        return;
      }

      onNeedsAttentionChangeRef.current((current) =>
        syncNeedsAttentionList(current, updatedItem),
      );
    };

    const handleMessageInsert = (message: InboxRealtimeMessageRow) => {
      if (hasActiveFiltersRef.current) {
        scheduleRefresh();
        return;
      }

      let updatedItem: ConversationListItem | null = null;

      onConversationsChangeRef.current((current) => {
        const result = applyRealtimeMessageToList(current, message, {
          selectedConversationId: selectedConversationIdRef.current,
          channelFilter,
        });

        updatedItem = result.updatedItem;

        if (!result.found) {
          scheduleRefresh();
          return current;
        }

        return result.items;
      });

      applyListUpdates(updatedItem);
    };

    const handleConversationUpsert = async (
      row: InboxRealtimeConversationRow,
      isInsert: boolean,
    ) => {
      if (channelFilter && row.channel !== channelFilter) {
        return;
      }

      if (hasActiveFiltersRef.current) {
        scheduleRefresh();
        return;
      }

      let updatedItem: ConversationListItem | null = null;
      let needsFetch = isInsert;

      onConversationsChangeRef.current((current) => {
        const existing = current.find((conversation) => conversation.id === row.id);

        if (!existing && isInsert) {
          needsFetch = true;
          return current;
        }

        if (!existing) {
          scheduleRefresh();
          return current;
        }

        needsFetch = false;

        const result = applyRealtimeConversationUpdate(current, row, {
          selectedConversationId: selectedConversationIdRef.current,
          channelFilter,
        });

        updatedItem = result.updatedItem;
        return result.items;
      });

      if (needsFetch) {
        const result = await fetchConversationListItemAction({
          conversationId: row.id,
        });

        if (result.success) {
          const item =
            selectedConversationIdRef.current === result.data.id
              ? { ...result.data, isUnread: false }
              : result.data;

          onConversationsChangeRef.current((current) =>
            prependConversationListItem(current, item),
          );
          applyListUpdates(item);
        } else {
          scheduleRefresh();
        }

        return;
      }

      applyListUpdates(updatedItem);
    };

    const channel = supabase
      .channel("inbox-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          handleMessageInsert(payload.new as InboxRealtimeMessageRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          void handleConversationUpsert(
            payload.new as InboxRealtimeConversationRow,
            true,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          void handleConversationUpsert(
            payload.new as InboxRealtimeConversationRow,
            false,
          );
        },
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [channelFilter, enabled]);
}
