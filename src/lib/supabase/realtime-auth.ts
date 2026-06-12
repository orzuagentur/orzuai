import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

let prepareGeneration = 0;
let preparePromise: Promise<boolean> | null = null;

export async function ensureSupabaseRealtimeAuth(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return false;
  }

  await supabase.realtime.setAuth(data.session.access_token);
  return true;
}

/**
 * Sets JWT on the Realtime socket and reconnects so postgres_changes respect RLS.
 * Subscriptions created before this completes may never receive events.
 */
export async function prepareSupabaseRealtime(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const generation = ++prepareGeneration;
  const authed = await ensureSupabaseRealtimeAuth(supabase);

  if (!authed || generation !== prepareGeneration) {
    return false;
  }

  supabase.realtime.disconnect();
  supabase.realtime.connect();

  return true;
}

export function waitForSupabaseRealtime(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  if (!preparePromise) {
    preparePromise = prepareSupabaseRealtime(supabase).finally(() => {
      preparePromise = null;
    });
  }

  return preparePromise;
}

export function invalidateSupabaseRealtime(): void {
  prepareGeneration += 1;
  preparePromise = null;
}

export function bindSupabaseRealtimeAuthRefresh(
  supabase: SupabaseClient<Database>,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    invalidateSupabaseRealtime();

    if (session?.access_token) {
      void prepareSupabaseRealtime(supabase);
    }
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
