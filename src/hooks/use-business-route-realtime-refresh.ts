"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createClientIfConfigured } from "@/lib/supabase/client";
import { waitForSupabaseRealtime } from "@/lib/supabase/realtime-auth";

type BusinessRealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

type BusinessRealtimeTarget = {
  table: string;
  event: BusinessRealtimeEvent;
};

type UseBusinessRouteRealtimeRefreshInput = {
  businessId: string;
  channelName: string;
  targets: BusinessRealtimeTarget[];
  debounceMs?: number;
};

const DEFAULT_REFRESH_DEBOUNCE_MS = 500;

export function useBusinessRouteRealtimeRefresh({
  businessId,
  channelName,
  targets,
  debounceMs = DEFAULT_REFRESH_DEBOUNCE_MS,
}: UseBusinessRouteRealtimeRefreshInput) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refreshTimeoutRef = useRef<number | null>(null);
  const targetsRef = useRef(targets);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  targetsRef.current = targets;

  const targetKey = targets
    .map((target) => `${target.table}:${target.event}`)
    .join("|");

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setReconnectNonce((current) => current + 1);
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!businessId || targetsRef.current.length === 0) {
      return;
    }

    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          router.refresh();
        });
      }, debounceMs);
    };

    void (async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled || !authed) {
        return;
      }

      const subscription = supabase.channel(
        `${channelName}:${businessId}:${reconnectNonce}`,
      );

      for (const target of targetsRef.current) {
        subscription.on(
          "postgres_changes",
          {
            event: target.event,
            schema: "public",
            table: target.table,
            filter: `business_id=eq.${businessId}`,
          },
          () => {
            scheduleRefresh();
          },
        );
      }

      channel = subscription.subscribe((status) => {
        if (status === "SUBSCRIBED" && reconnectNonce > 0) {
          scheduleRefresh();
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          window.setTimeout(() => {
            setReconnectNonce((current) => current + 1);
          }, 2000);
        }
      });
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
  }, [businessId, channelName, debounceMs, reconnectNonce, router, targetKey]);
}
