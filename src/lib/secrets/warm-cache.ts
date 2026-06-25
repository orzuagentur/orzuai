import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { warmSecretCache } from "@orzu/secrets/server";

let warmPromise: Promise<number> | null = null;

export async function ensureSecretsCacheWarm(): Promise<void> {
  if (!process.env.ENCRYPTION_KEY?.trim()) {
    return;
  }

  if (!warmPromise) {
    warmPromise = warmSecretCache(createAdminClient()).catch((error) => {
      warmPromise = null;
      console.warn("[secrets] cache warm failed", error);
      return 0;
    });
  }

  await warmPromise;
}
