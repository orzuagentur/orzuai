"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchNavBadgeCountsAction } from "@/features/dashboard/actions/fetch-nav-badge-counts";
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

const POLL_MS = 20_000;

export function useDashboardNavBadges() {
  const [counts, setCounts] = useState<DashboardNavBadgeCounts>(DEFAULT_COUNTS);

  const refresh = useCallback(async () => {
    const result = await fetchNavBadgeCountsAction();

    if (result.success) {
      setCounts(result.data);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [refresh]);

  return { counts, refresh };
}
