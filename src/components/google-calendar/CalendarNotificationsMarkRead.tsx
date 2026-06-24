"use client";

import { useEffect } from "react";

import { markCalendarNotificationsReadAction } from "@/features/dashboard/actions/mark-calendar-notifications-read";
import { useDashboardNavBadges } from "@/hooks/use-dashboard-nav-badges";

export function CalendarNotificationsMarkRead() {
  const { refresh } = useDashboardNavBadges();

  useEffect(() => {
    void markCalendarNotificationsReadAction().then(() => refresh({ force: true }));
  }, [refresh]);

  return null;
}
