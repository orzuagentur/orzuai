import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

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

export function bindSupabaseRealtimeAuthRefresh(
  supabase: SupabaseClient<Database>,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) {
      void supabase.realtime.setAuth(session.access_token);
    }
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
