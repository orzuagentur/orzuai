"use client";

import { useEffect, useState } from "react";

import { createClientIfConfigured } from "@/lib/supabase/client";
import {
  bindSupabaseRealtimeAuthRefresh,
  waitForSupabaseRealtime,
} from "@/lib/supabase/realtime-auth";

/**
 * Warms up authenticated Realtime before inbox subscriptions mount.
 */
export function useSupabaseRealtimeBootstrap() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = createClientIfConfigured();

    if (!supabase) {
      return;
    }

    let unbindAuthRefresh: (() => void) | null = null;
    let cancelled = false;

    const prepare = async () => {
      const authed = await waitForSupabaseRealtime(supabase);

      if (cancelled) {
        return;
      }

      setIsReady(authed);

      if (authed && !unbindAuthRefresh) {
        unbindAuthRefresh = bindSupabaseRealtimeAuthRefresh(supabase);
      }
    };

    void prepare();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void prepare();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      unbindAuthRefresh?.();
    };
  }, []);

  return { isReady };
}
