"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchNavBadgeCountsAction } from "@/features/dashboard/actions/fetch-nav-badge-counts";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type { DashboardNavBadgeCounts } from "@/services/conversation-read.service";
import type { MessagingChannel } from "@/types/database.types";
import { sumUnreadByChannel } from "@/utils/conversation-unread";
import { createEmptyUnreadByChannel } from "@/utils/messaging-channel-defaults";

const DEFAULT_COUNTS: DashboardNavBadgeCounts = {
  inboxUnread: 0,
  crmUnread: 0,
  calendarAiUnread: 0,
  unreadByChannel: createEmptyUnreadByChannel(),
};

const POLL_MS = 60_000;
const REALTIME_REFRESH_DEBOUNCE_MS = 500;
const OPTIMISTIC_READ_SUPPRESS_MS = 4_000;

type MarkConversationReadOptimisticInput = {
  channel: MessagingChannel;
  unreadCount: number;
};

type IncrementInboundMessageOptimisticInput = {
  channel: MessagingChannel;
};

type DashboardNavBadgesContextValue = {
  counts: DashboardNavBadgeCounts;
  refresh: (options?: { force?: boolean }) => Promise<void>;
  scheduleRefresh: () => void;
  markConversationReadOptimistic: (
    input: MarkConversationReadOptimisticInput,
  ) => void;
  incrementInboundMessageOptimistic: (
    input: IncrementInboundMessageOptimisticInput,
  ) => void;
};

const DashboardNavBadgesContext =
  createContext<DashboardNavBadgesContextValue | null>(null);

export function DashboardNavBadgesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [counts, setCounts] = useState<DashboardNavBadgeCounts>(DEFAULT_COUNTS);
  const refreshTimeoutRef = useRef<number | null>(null);
  const optimisticReadUntilRef = useRef(0);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (!options?.force && Date.now() < optimisticReadUntilRef.current) {
      return;
    }

    const result = await fetchNavBadgeCountsAction();

    if (result.success) {
      setCounts(result.data);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (Date.now() < optimisticReadUntilRef.current) {
      return;
    }

    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      void refresh({ force: true });
    }, REALTIME_REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  const incrementInboundMessageOptimistic = useCallback(
    ({ channel }: IncrementInboundMessageOptimisticInput) => {
      setCounts((current) => {
        const unreadByChannel = {
          ...current.unreadByChannel,
          [channel]: (current.unreadByChannel[channel] ?? 0) + 1,
        };

        return {
          ...current,
          unreadByChannel,
          inboxUnread: sumUnreadByChannel(unreadByChannel),
        };
      });
    },
    [],
  );

  const markConversationReadOptimistic = useCallback(
    ({ channel, unreadCount }: MarkConversationReadOptimisticInput) => {
      if (unreadCount <= 0) {
        return;
      }

      optimisticReadUntilRef.current = Date.now() + OPTIMISTIC_READ_SUPPRESS_MS;

      setCounts((current) => {
        const previousChannelCount = current.unreadByChannel[channel] ?? 0;
        const nextChannelCount = Math.max(
          0,
          previousChannelCount - unreadCount,
        );
        const unreadByChannel = {
          ...current.unreadByChannel,
          [channel]: nextChannelCount,
        };

        return {
          ...current,
          unreadByChannel,
          inboxUnread: sumUnreadByChannel(unreadByChannel),
        };
      });
    },
    [],
  );

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled || !authed) {
        return;
      }

      channel = supabase
        .channel("nav-badges")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversations",
          },
          () => {
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversation_reads",
          },
          () => {
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "contacts",
          },
          () => {
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "business_notifications",
          },
          () => {
            scheduleRefresh();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [scheduleRefresh]);

  return (
    <DashboardNavBadgesContext.Provider
      value={{
        counts,
        refresh,
        scheduleRefresh,
        markConversationReadOptimistic,
        incrementInboundMessageOptimistic,
      }}
    >
      {children}
    </DashboardNavBadgesContext.Provider>
  );
}

export function useDashboardNavBadges() {
  const context = useContext(DashboardNavBadgesContext);

  if (!context) {
    throw new Error(
      "useDashboardNavBadges must be used within DashboardNavBadgesProvider",
    );
  }

  return context;
}

export function useOptionalDashboardNavBadges() {
  return useContext(DashboardNavBadgesContext);
}
