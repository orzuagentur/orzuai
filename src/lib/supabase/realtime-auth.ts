import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

let prepareGeneration = 0;
let preparePromise: Promise<boolean> | null = null;
let appliedAuthToken: string | null = null;

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
 * Sets JWT on the Realtime socket and reconnects when the token changes.
 * Avoids disconnecting on every subscription — that was dropping active channels.
 */
export async function prepareSupabaseRealtime(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const generation = ++prepareGeneration;
  const authed = await ensureSupabaseRealtimeAuth(supabase);

  if (!authed || generation !== prepareGeneration) {
    return false;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;

  if (!token) {
    return false;
  }

  if (token === appliedAuthToken) {
    return true;
  }

  supabase.realtime.disconnect();
  supabase.realtime.connect();
  appliedAuthToken = token;

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
  appliedAuthToken = null;
}

let authRefreshBound = false;

/**
 * Registers a single global auth-state listener for Realtime JWT refresh.
 * Call once from dashboard bootstrap; subscription hooks only need waitForSupabaseRealtime.
 */
export function bindSupabaseRealtimeAuthRefresh(
  supabase: SupabaseClient<Database>,
): () => void {
  if (authRefreshBound) {
    return () => {};
  }

  authRefreshBound = true;

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    invalidateSupabaseRealtime();

    if (session?.access_token) {
      void prepareSupabaseRealtime(supabase);
    }
  });

  return () => {
    data.subscription.unsubscribe();
    authRefreshBound = false;
  };
}
