"use client";

import { useMemo } from "react";

import { useBusinessRouteRealtimeRefresh } from "@/hooks/use-business-route-realtime-refresh";

export function ContactsRealtimeRefresh({
  businessId,
}: {
  businessId: string;
}) {
  const targets = useMemo(
    () => [
      { table: "contacts", event: "*" as const },
      { table: "crm_deals", event: "*" as const },
      { table: "crm_tasks", event: "*" as const },
    ],
    [],
  );

  useBusinessRouteRealtimeRefresh({
    businessId,
    channelName: "contacts-route-refresh",
    targets,
  });

  return null;
}
