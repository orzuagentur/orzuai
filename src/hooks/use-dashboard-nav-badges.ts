"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchNavBadgeCountsAction } from "@/features/dashboard/actions/fetch-nav-badge-counts";
import { createClientIfConfigured } from "@/lib/supabase/client";
import {
  bindSupabaseRealtimeAuthRefresh,
  waitForSupabaseRealtime,
} from "@/lib/supabase/realtime-auth";
import type { DashboardNavBadgeCounts } from "@/services/conversation-read.service";

const DEFAULT_COUNTS: DashboardNavBadgeCounts = {
  inboxUnread: 0,
  crmUnread: 0,
  unreadByChannel: {
    whatsapp: 0,
    telegram: 0,
    instagram: 0,
    website_forms: 0,
  },
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

    let unbindAuthRefresh: (() => void) | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled || !authed) {
        return;
      }

      unbindAuthRefresh = bindSupabaseRealtimeAuthRefresh(supabase);

      if (cancelled) {
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
      unbindAuthRefresh?.();

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
