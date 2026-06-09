"use client";

import { useEffect } from "react";

import { createClientIfConfigured } from "@/lib/supabase/client";
import {
  bindSupabaseRealtimeAuthRefresh,
  ensureSupabaseRealtimeAuth,
} from "@/lib/supabase/realtime-auth";

const BOOTSTRAP_CHANNEL = "orzu-realtime-bootstrap";

/**
 * Warms up the authenticated Realtime WebSocket before inbox subscriptions.
 * Fixes first-load subscriptions connecting as anon (no RLS events).
 */
export function useSupabaseRealtimeBootstrap() {
  useEffect(() => {
    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let unbindAuthRefresh: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      const authed = await ensureSupabaseRealtimeAuth(supabase);

      if (cancelled) {
        return;
      }

      if (authed) {
        unbindAuthRefresh = bindSupabaseRealtimeAuthRefresh(supabase);
      }

      const channel = supabase.channel(BOOTSTRAP_CHANNEL);

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void supabase.removeChannel(channel);
        }
      });
    })();

    return () => {
      cancelled = true;
      unbindAuthRefresh?.();
    };
  }, []);
}
