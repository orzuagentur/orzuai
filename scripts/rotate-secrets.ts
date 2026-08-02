#!/usr/bin/env tsx
/**
 * Re-encrypts every row in `app_secrets` with the current primary ENCRYPTION_KEY.
 *
 * Zero-downtime key rotation:
 *   1. In Vercel: set ENCRYPTION_KEY_PREVIOUS = old key, ENCRYPTION_KEY = new key.
 *   2. Redeploy (app keeps reading old rows via the previous key).
 *   3. Run this script:  npm run rotate:secrets
 *   4. Remove ENCRYPTION_KEY_PREVIOUS from Vercel and redeploy.
 *
 * Run: npm run rotate:secrets   (loads .env.local via tsx --env-file)
 */
import { createClient } from "@supabase/supabase-js";

import { reEncryptAllSecrets } from "@orzu/secrets/server";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  // Fail fast if the primary key is missing.
  requireEnv("ENCRYPTION_KEY");

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!process.env.ENCRYPTION_KEY_PREVIOUS?.trim()) {
    console.warn(
      "[rotate] ENCRYPTION_KEY_PREVIOUS is not set — rows encrypted with an " +
        "older key cannot be recovered. Continuing (rows already on the current " +
        "key will simply be rewritten).",
    );
  }

  console.log("[rotate] re-encrypting all secrets with the primary key...");

  const result = await reEncryptAllSecrets(admin);

  console.log(
    `[rotate] done. total=${result.total} reEncrypted=${result.reEncrypted} failed=${result.failed}`,
  );

  if (result.failed > 0) {
    console.error(
      `[rotate] ${result.failed} secret(s) could not be re-encrypted. ` +
        "Check that ENCRYPTION_KEY_PREVIOUS matches the key those rows were encrypted with.",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
