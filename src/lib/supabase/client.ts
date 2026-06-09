import { createBrowserClient } from "@supabase/ssr";

import { ENV_KEYS } from "@/constants/env-keys";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasClientSupabaseEnv,
} from "@/lib/env";
import type { Database } from "@/types/database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

function getBrowserEnv() {
  return {
    url: process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL]?.trim() ?? "",
    anonKey: process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]?.trim() ?? "",
  };
}

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

  if (!browserClient) {
    const { url, anonKey } = getBrowserEnv();
    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}
