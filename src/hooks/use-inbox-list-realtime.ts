"use client";

import { useEffect, useRef, useState } from "react";

import { fetchConversationListItemAction } from "@/features/chats/actions/fetch-conversation-list-item";
import { createClientIfConfigured } from "@/lib/supabase/client";
import {
  bindSupabaseRealtimeAuthRefresh,
  waitForSupabaseRealtime,
} from "@/lib/supabase/realtime-auth";
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
  onConnectionChange?: (connected: boolean) => void;
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
  onConnectionChange,
  onRefresh,
}: UseInboxListRealtimeOptions) {
  const onConversationsChangeRef = useRef(onConversationsChange);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onNeedsAttentionChangeRef = useRef(onNeedsAttentionChange);
  const onRefreshRef = useRef(onRefresh);
  const refreshTimeoutRef = useRef<number | null>(null);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const hasActiveFiltersRef = useRef(hasActiveFilters);

  onConversationsChangeRef.current = onConversationsChange;
  onNeedsAttentionChangeRef.current = onNeedsAttentionChange;
  onConnectionChangeRef.current = onConnectionChange;
  onRefreshRef.current = onRefresh;
  selectedConversationIdRef.current = selectedConversationId;
  hasActiveFiltersRef.current = hasActiveFilters;
  const [reconnectNonce, setReconnectNonce] = useState(0);

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
    if (!enabled) {
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let unbindAuthRefresh: (() => void) | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

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
              ? {
                  ...result.data,
                  isUnread: false,
                  unreadMessageCount: 0,
                }
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

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled) {
        return;
      }

      if (!authed) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[realtime] inbox list skipped — no authenticated session");
        }
        return;
      }

      unbindAuthRefresh = bindSupabaseRealtimeAuthRefresh(supabase);

      if (cancelled) {
        return;
      }

      channel = supabase
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
        .subscribe((status) => {
          onConnectionChangeRef.current?.(status === "SUBSCRIBED");

          if (
            process.env.NODE_ENV === "development" &&
            (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          ) {
            console.warn(`[realtime] inbox-list channel ${status}`);
          }
        });
    })();

    return () => {
      cancelled = true;
      onConnectionChangeRef.current?.(false);

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      unbindAuthRefresh?.();

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [channelFilter, enabled, reconnectNonce]);
}
