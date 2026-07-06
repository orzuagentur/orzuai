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

import { dismissAiHumanRequestAction } from "@/features/dashboard/actions/dismiss-ai-human-request";
import { declineAiHumanRequestAction } from "@/features/dashboard/actions/decline-ai-human-request";
import { deleteBusinessNotificationAction } from "@/features/dashboard/actions/delete-business-notification";
import { fetchAiHumanRequestsAction } from "@/features/dashboard/actions/fetch-ai-human-requests";
import { fetchBusinessNotificationsAction } from "@/features/dashboard/actions/fetch-business-notifications";
import { markBusinessNotificationsReadAction } from "@/features/dashboard/actions/mark-business-notifications-read";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type { AiHumanRequest } from "@/types/ai-human-request.types";
import type { BusinessNotification } from "@/types/business-notification.types";
import type { MessagingChannel } from "@/types/database.types";

const POLL_MS = 15_000;
const REALTIME_REFRESH_DEBOUNCE_MS = 500;

type AiHumanRequestsContextValue = {
  notifications: BusinessNotification[];
  requests: AiHumanRequest[];
  count: number;
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  scheduleRefresh: () => void;
  markAllRead: () => Promise<void>;
  dismissRequest: (requestId: string) => Promise<boolean>;
  declineRequest: (
    requestId: string,
  ) => Promise<{ success: boolean; customerNotified: boolean }>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
};

const AiHumanRequestsContext = createContext<AiHumanRequestsContextValue | null>(
  null,
);

type RealtimeHumanRequestRow = {
  id: string;
  business_id: string;
  conversation_id: string;
  contact_id: string | null;
  channel: MessagingChannel;
  contact_name: string;
  reason: string;
  message_preview: string;
  created_at: string;
};

type RealtimeNotificationRow = {
  id: string;
  business_id: string;
  kind: string;
  conversation_id: string;
  contact_id: string | null;
  channel: MessagingChannel;
  contact_name: string;
  title: string;
  body: string;
  details: Record<string, unknown>;
  source_id: string | null;
  read_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

function mapRealtimeHumanRequestRow(row: RealtimeHumanRequestRow): AiHumanRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    conversationId: row.conversation_id,
    contactId: row.contact_id,
    channel: row.channel,
    contactName: row.contact_name,
    reason: row.reason,
    messagePreview: row.message_preview,
    createdAt: row.created_at,
  };
}

function mapRealtimeNotificationRow(
  row: RealtimeNotificationRow,
): BusinessNotification {
  return {
    id: row.id,
    businessId: row.business_id,
    kind: row.kind as BusinessNotification["kind"],
    conversationId: row.conversation_id,
    contactId: row.contact_id,
    channel: row.channel,
    contactName: row.contact_name,
    title: row.title,
    body: row.body,
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? row.details
        : {},
    sourceId: row.source_id,
    readAt: row.read_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export function AiHumanRequestsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<BusinessNotification[]>([]);
  const [requests, setRequests] = useState<AiHumanRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const [notificationsResult, requestsResult] = await Promise.all([
      fetchBusinessNotificationsAction(),
      fetchAiHumanRequestsAction(),
    ]);

    if (notificationsResult.success) {
      setNotifications(notificationsResult.data);
      setUnreadCount(notificationsResult.unreadCount);
    }

    if (requestsResult.success) {
      setRequests(requestsResult.data);
    }

    setIsLoading(false);
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      void refresh();
    }, REALTIME_REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    const result = await markBusinessNotificationsReadAction();

    if (!result.success) {
      return;
    }

    const now = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) =>
        item.readAt ? item : { ...item, readAt: now },
      ),
    );
    setUnreadCount(0);
  }, []);

  const dismissRequest = useCallback(async (requestId: string) => {
    const result = await dismissAiHumanRequestAction(requestId);

    if (!result.success) {
      return false;
    }

    setRequests((current) => current.filter((item) => item.id !== requestId));

    const now = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) =>
        item.kind === "human_request" && item.sourceId === requestId
          ? { ...item, resolvedAt: now, readAt: now }
          : item,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    return true;
  }, []);

  const declineRequest = useCallback(async (requestId: string) => {
    const result = await declineAiHumanRequestAction(requestId);

    if (!result.success) {
      return { success: false, customerNotified: false };
    }

    setRequests((current) => current.filter((item) => item.id !== requestId));

    const now = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) =>
        item.kind === "human_request" && item.sourceId === requestId
          ? { ...item, resolvedAt: now, readAt: now }
          : item,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    return {
      success: true,
      customerNotified: result.customerNotified,
    };
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((current) => {
      const existing = current.find((item) => item.id === notificationId);

      if (existing && !existing.readAt) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      return current.filter((item) => item.id !== notificationId);
    });
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const result = await deleteBusinessNotificationAction(notificationId);

    if (!result.success) {
      return false;
    }

    removeNotification(notificationId);
    return true;
  }, [removeNotification]);

  const upsertRequest = useCallback((request: AiHumanRequest) => {
    setRequests((current) => {
      const withoutDuplicate = current.filter(
        (item) => item.conversationId !== request.conversationId,
      );

      return [request, ...withoutDuplicate].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    });
  }, []);

  const removeRequest = useCallback((requestId: string) => {
    setRequests((current) => current.filter((item) => item.id !== requestId));
  }, []);

  const upsertNotification = useCallback((notification: BusinessNotification) => {
    setNotifications((current) => {
      const existing = current.find((item) => item.id === notification.id);
      const withoutDuplicate = current.filter(
        (item) => item.id !== notification.id,
      );

      if (!existing && !notification.readAt) {
        setUnreadCount((count) => count + 1);
      }

      return [notification, ...withoutDuplicate].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
    });
  }, []);

  const updateNotification = useCallback((notification: BusinessNotification) => {
    setNotifications((current) => {
      const existing = current.find((item) => item.id === notification.id);
      const wasUnread = existing ? !existing.readAt : false;
      const isUnread = !notification.readAt;

      if (wasUnread && !isUnread) {
        setUnreadCount((count) => Math.max(0, count - 1));
      } else if (!wasUnread && isUnread) {
        setUnreadCount((count) => count + 1);
      }

      return current
        .map((item) => (item.id === notification.id ? notification : item))
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        );
    });
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

  useEffect(() => {
    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let humanChannel: ReturnType<typeof supabase.channel> | null = null;
    let notificationsChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled || !authed) {
        return;
      }

      humanChannel = supabase
        .channel("ai-human-requests")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ai_human_requests",
          },
          (payload) => {
            upsertRequest(mapRealtimeHumanRequestRow(payload.new as RealtimeHumanRequestRow));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ai_human_requests",
          },
          (payload) => {
            upsertRequest(mapRealtimeHumanRequestRow(payload.new as RealtimeHumanRequestRow));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "ai_human_requests",
          },
          (payload) => {
            const deleted = payload.old as { id?: string };

            if (deleted.id) {
              removeRequest(deleted.id);
            } else {
              scheduleRefresh();
            }
          },
        )
        .subscribe();

      notificationsChannel = supabase
        .channel("business-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "business_notifications",
          },
          (payload) => {
            upsertNotification(
              mapRealtimeNotificationRow(payload.new as RealtimeNotificationRow),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "business_notifications",
          },
          (payload) => {
            updateNotification(
              mapRealtimeNotificationRow(payload.new as RealtimeNotificationRow),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "business_notifications",
          },
          (payload) => {
            const deleted = payload.old as { id?: string };

            if (deleted.id) {
              removeNotification(deleted.id);
            } else {
              scheduleRefresh();
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      if (humanChannel) {
        void supabase.removeChannel(humanChannel);
      }

      if (notificationsChannel) {
        void supabase.removeChannel(notificationsChannel);
      }
    };
  }, [
    removeNotification,
    removeRequest,
    scheduleRefresh,
    updateNotification,
    upsertNotification,
    upsertRequest,
  ]);

  return (
    <AiHumanRequestsContext.Provider
      value={{
        notifications,
        requests,
        count: unreadCount,
        unreadCount,
        isLoading,
        refresh,
        scheduleRefresh,
        markAllRead,
        dismissRequest,
        declineRequest,
        deleteNotification,
      }}
    >
      {children}
    </AiHumanRequestsContext.Provider>
  );
}

export function useAiHumanRequests() {
  const context = useContext(AiHumanRequestsContext);

  if (!context) {
    throw new Error(
      "useAiHumanRequests must be used within AiHumanRequestsProvider",
    );
  }

  return context;
}
