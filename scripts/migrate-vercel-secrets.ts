#!/usr/bin/env tsx
/**
 * Migrates migratable process.env secrets into app_secrets (encrypted).
 * Run: npm run migrate:secrets
 */
import { createClient } from "@supabase/supabase-js";

import { collectMigratableEnvKeys } from "@orzu/secrets/bootstrap";
import { getEncryptionKeyFromEnv } from "@orzu/secrets/crypto";
import { setSecret } from "@orzu/secrets/server";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  getEncryptionKeyFromEnv();

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const candidates = collectMigratableEnvKeys(process.env);
  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const entry of candidates) {
    const { data: existing } = await admin
      .from("app_secrets")
      .select("id")
      .eq("key_name", entry.key)
      .maybeSingle();

    if (existing?.id) {
      skipped.push(entry.key);
      continue;
    }

    await setSecret(admin, {
      keyName: entry.key,
      value: entry.value,
      description: "Imported from Vercel environment",
      actorEmail: "migrate-vercel-secrets",
    });

    migrated.push(entry.key);
  }

  console.log("Secret migration complete.");
  console.log(`Migrated (${migrated.length}):`);

  for (const key of migrated) {
    console.log(`  + ${key}`);
  }

  if (skipped.length > 0) {
    console.log(`Skipped existing (${skipped.length}):`);

    for (const key of skipped) {
      console.log(`  - ${key}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
