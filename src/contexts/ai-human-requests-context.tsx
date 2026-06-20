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
import { fetchAiHumanRequestsAction } from "@/features/dashboard/actions/fetch-ai-human-requests";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";
import type { AiHumanRequest } from "@/types/ai-human-request.types";
import type { MessagingChannel } from "@/types/database.types";

const POLL_MS = 60_000;
const REALTIME_REFRESH_DEBOUNCE_MS = 500;

type AiHumanRequestsContextValue = {
  requests: AiHumanRequest[];
  count: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  scheduleRefresh: () => void;
  dismissRequest: (requestId: string) => Promise<boolean>;
  declineRequest: (
    requestId: string,
  ) => Promise<{ success: boolean; customerNotified: boolean }>;
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

function mapRealtimeRow(row: RealtimeHumanRequestRow): AiHumanRequest {
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

export function AiHumanRequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<AiHumanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimeoutRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchAiHumanRequestsAction();

    if (result.success) {
      setRequests(result.data);
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

  const dismissRequest = useCallback(async (requestId: string) => {
    const result = await dismissAiHumanRequestAction(requestId);

    if (!result.success) {
      return false;
    }

    setRequests((current) => current.filter((item) => item.id !== requestId));
    return true;
  }, []);

  const declineRequest = useCallback(async (requestId: string) => {
    const result = await declineAiHumanRequestAction(requestId);

    if (!result.success) {
      return { success: false, customerNotified: false };
    }

    setRequests((current) => current.filter((item) => item.id !== requestId));
    return {
      success: true,
      customerNotified: result.customerNotified,
    };
  }, []);

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
        .channel("ai-human-requests")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ai_human_requests",
          },
          (payload) => {
            upsertRequest(mapRealtimeRow(payload.new as RealtimeHumanRequestRow));
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
            upsertRequest(mapRealtimeRow(payload.new as RealtimeHumanRequestRow));
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
  }, [removeRequest, scheduleRefresh, upsertRequest]);

  return (
    <AiHumanRequestsContext.Provider
      value={{
        requests,
        count: requests.length,
        isLoading,
        refresh,
        scheduleRefresh,
        dismissRequest,
        declineRequest,
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
