"use client";

import { createContext, useContext } from "react";

import { usePushNotifications } from "@/hooks/use-push-notifications";

type PushNotificationsContextValue = ReturnType<typeof usePushNotifications>;

const PushNotificationsContext =
  createContext<PushNotificationsContextValue | null>(null);

export function PushNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = usePushNotifications();

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotificationsContext(): PushNotificationsContextValue {
  const context = useContext(PushNotificationsContext);

  if (!context) {
    throw new Error(
      "usePushNotificationsContext must be used within PushNotificationsProvider",
    );
  }

  return context;
}
