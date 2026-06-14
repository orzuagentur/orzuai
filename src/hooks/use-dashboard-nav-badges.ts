"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchNavBadgeCountsAction } from "@/features/dashboard/actions/fetch-nav-badge-counts";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type { DashboardNavBadgeCounts } from "@/services/conversation-read.service";
import { createEmptyUnreadByChannel } from "@/utils/messaging-channel-defaults";

const DEFAULT_COUNTS: DashboardNavBadgeCounts = {
  inboxUnread: 0,
  crmUnread: 0,
  unreadByChannel: createEmptyUnreadByChannel(),
};

const POLL_MS = 60_000;
const REALTIME_REFRESH_DEBOUNCE_MS = 500;

export function useDashboardNavBadges() {
  const [counts, setCounts] = useState<DashboardNavBadgeCounts>(DEFAULT_COUNTS);
  const refreshTimeoutRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchNavBadgeCountsAction();

    if (result.success) {
      setCounts(result.data);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      void refresh();
    }, REALTIME_REFRESH_DEBOUNCE_MS);
  }, [refresh]);

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
            event: "INSERT",
            schema: "public",
            table: "messages",
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

  return { counts, refresh };
}
