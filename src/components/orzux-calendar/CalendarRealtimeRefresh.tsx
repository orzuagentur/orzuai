"use client";

import { useMemo } from "react";

import { useBusinessRouteRealtimeRefresh } from "@/hooks/use-business-route-realtime-refresh";

export function CalendarRealtimeRefresh({
  businessId,
}: {
  businessId: string;
}) {
  const targets = useMemo(
    () => [
      { table: "calendar_events", event: "INSERT" as const },
      { table: "calendar_tasks", event: "INSERT" as const },
    ],
    [],
  );

  useBusinessRouteRealtimeRefresh({
    businessId,
    channelName: "calendar-route-refresh",
    targets,
  });

  return null;
}
