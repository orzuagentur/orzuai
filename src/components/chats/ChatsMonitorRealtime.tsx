"use client";

import { usePollingRefresh } from "@/hooks/use-polling-refresh";

type ChatsMonitorRealtimeProps = {
  children: React.ReactNode;
};

export function ChatsMonitorRealtime({ children }: ChatsMonitorRealtimeProps) {
  usePollingRefresh(5000);
  return <>{children}</>;
}
