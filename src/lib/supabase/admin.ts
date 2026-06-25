import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";
import type { Database } from "@/types/database.types";

let startupScheduled = false;

export function createAdminClient() {
  if (!startupScheduled) {
    startupScheduled = true;
    void import("@/lib/startup/node").then(({ scheduleNodeStartup }) => {
      scheduleNodeStartup();
    });
  }

  return createClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
