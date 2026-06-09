import { createBrowserClient } from "@supabase/ssr";

import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasClientSupabaseEnv,
} from "@/lib/env";
import { ENV_KEYS } from "@/constants/env-keys";
import type { Database } from "@/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
  );
}

/** Safe for client hooks — returns null when public Supabase env is not configured. */
export function createClientIfConfigured() {
  if (!hasClientSupabaseEnv()) {
    return null;
  }

  return createBrowserClient<Database>(
    process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL]!.trim(),
    process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]!.trim(),
  );
}
