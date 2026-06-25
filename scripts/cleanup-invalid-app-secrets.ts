#!/usr/bin/env tsx
/**
 * Removes app_secrets rows that are not valid OrzuAI secrets
 * (e.g. Windows/VS Code env vars accidentally migrated locally).
 *
 * Run: npm run cleanup:secrets
 */
import { createClient } from "@supabase/supabase-js";

import {
  isBootstrapEnvKey,
  isMigratableAppSecretKey,
} from "@orzu/secrets/bootstrap";
import { deleteSecret } from "@orzu/secrets/server";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("app_secrets")
    .select("key_name")
    .order("key_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const invalid = (data ?? [])
    .map((row) => row.key_name as string)
    .filter(
      (keyName) =>
        !isMigratableAppSecretKey(keyName) && !isBootstrapEnvKey(keyName),
    );

  if (invalid.length === 0) {
    console.log("No invalid app_secrets rows found.");
    return;
  }

  console.log(`Removing ${invalid.length} invalid secret(s):`);

  for (const keyName of invalid) {
    console.log(`  - ${keyName}`);
    await deleteSecret(admin, keyName, {
      actorEmail: "cleanup-invalid-app-secrets",
    });
  }

  console.log("Cleanup complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
