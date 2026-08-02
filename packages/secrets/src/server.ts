import type { SupabaseClient } from "@supabase/supabase-js";

import {
  decryptSecretValueWithRotation,
  encryptSecretValue,
  getEncryptionKeyFromEnv,
} from "./crypto";
import { maskSecretValue } from "./mask";
import {
  applySecretCache,
  deleteCachedSecret,
  setCachedSecret,
} from "./runtime";
import type { AppSecretAuditRecord, AppSecretRecord } from "./types";

type SecretRow = {
  id: string;
  key_name: string;
  encrypted_value: string;
  description: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

type AuditRow = {
  id: string;
  secret_id: string | null;
  key_name: string;
  action: AppSecretAuditRecord["action"];
  actor_user_id: string | null;
  actor_email: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Prefix for per-business integration tokens (Gmail/Calendar/WhatsApp/etc.).
 * These are user OAuth tokens: they are always resolved on-demand server-side
 * via `getSecret` (which caches individually with a TTL), and are never read
 * from the global warm cache by edge/runtime code. Keeping them out of the warm
 * cache drastically reduces how many decrypted user secrets sit in process
 * memory at once.
 */
const PER_BUSINESS_SECRET_PREFIX = "INTEGRATION_SECRET_";

export async function warmSecretCache(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("app_secrets")
    .select("key_name, encrypted_value, is_active")
    .not("key_name", "like", `${PER_BUSINESS_SECRET_PREFIX}%`);

  if (error) {
    throw new Error(error.message);
  }

  const nextCache = new Map<string, string>();

  for (const row of (data ?? []) as Array<{
    key_name: string;
    encrypted_value: string;
    is_active: boolean;
  }>) {
    if (!row.is_active) {
      continue;
    }

    // Defense-in-depth: never warm per-business tokens even if the query filter
    // is ever relaxed or bypassed.
    if (row.key_name.startsWith(PER_BUSINESS_SECRET_PREFIX)) {
      continue;
    }

    try {
      nextCache.set(
        row.key_name,
        decryptSecretValueWithRotation(row.encrypted_value),
      );
    } catch {
      // Skip invalid ciphertext rows during cache warm.
    }
  }

  applySecretCache(nextCache);
  return nextCache.size;
}

async function writeAuditLog(
  admin: SupabaseClient,
  input: {
    secretId?: string | null;
    keyName: string;
    action: AppSecretAuditRecord["action"];
    actorUserId?: string | null;
    actorEmail?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await admin.from("app_secret_audit_log").insert({
    secret_id: input.secretId ?? null,
    key_name: input.keyName,
    action: input.action,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? "",
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

function mapSecretRow(row: SecretRow, decrypted?: string): AppSecretRecord {
  return {
    id: row.id,
    keyName: row.key_name,
    description: row.description,
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    updatedByEmail: null,
    maskedValue: maskSecretValue(decrypted ?? "********"),
  };
}

export async function listSecrets(admin: SupabaseClient): Promise<AppSecretRecord[]> {
  const { data, error } = await admin
    .from("app_secrets")
    .select(
      "id, key_name, encrypted_value, description, is_active, last_used_at, created_at, updated_at, updated_by",
    )
    .order("key_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SecretRow[]).map((row) => {
    let decrypted = "";

    try {
      decrypted = decryptSecretValueWithRotation(row.encrypted_value);
    } catch {
      decrypted = "********";
    }

    return mapSecretRow(row, decrypted);
  });
}

export async function getSecret(
  admin: SupabaseClient,
  keyName: string,
  options?: {
    actorUserId?: string | null;
    actorEmail?: string;
    auditView?: boolean;
  },
): Promise<string | null> {
  const { data, error } = await admin
    .from("app_secrets")
    .select("id, encrypted_value, is_active")
    .eq("key_name", keyName)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as {
    id: string;
    encrypted_value: string;
    is_active: boolean;
  } | null;

  if (!row?.is_active) {
    return null;
  }

  const value = decryptSecretValueWithRotation(row.encrypted_value);

  setCachedSecret(keyName, value);

  if (options?.auditView) {
    await writeAuditLog(admin, {
      secretId: row.id,
      keyName,
      action: "viewed",
      actorUserId: options.actorUserId,
      actorEmail: options.actorEmail,
    });
  }

  return value;
}

export async function setSecret(
  admin: SupabaseClient,
  input: {
    keyName: string;
    value: string;
    description?: string;
    actorUserId?: string | null;
    actorEmail?: string;
  },
): Promise<AppSecretRecord> {
  const keyName = input.keyName.trim().toUpperCase();

  if (!/^[A-Z][A-Z0-9_]*$/.test(keyName)) {
    throw new Error("Secret key must match ^[A-Z][A-Z0-9_]*$.");
  }

  const encryptedValue = encryptSecretValue(
    input.value.trim(),
    getEncryptionKeyFromEnv(),
  );

  const { data: existing } = await admin
    .from("app_secrets")
    .select("id")
    .eq("key_name", keyName)
    .maybeSingle();

  const existingRow = existing as { id: string } | null;
  let row: SecretRow;

  if (existingRow?.id) {
    const { data, error } = await admin
      .from("app_secrets")
      .update({
        encrypted_value: encryptedValue,
        description: input.description?.trim() ?? "",
        updated_by: input.actorUserId ?? null,
        is_active: true,
      })
      .eq("id", existingRow.id)
      .select(
        "id, key_name, encrypted_value, description, is_active, last_used_at, created_at, updated_at, updated_by",
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update secret.");
    }

    row = data as SecretRow;

    await writeAuditLog(admin, {
      secretId: row.id,
      keyName,
      action: "updated",
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
    });
  } else {
    const { data, error } = await admin
      .from("app_secrets")
      .insert({
        key_name: keyName,
        encrypted_value: encryptedValue,
        description: input.description?.trim() ?? "",
        updated_by: input.actorUserId ?? null,
      })
      .select(
        "id, key_name, encrypted_value, description, is_active, last_used_at, created_at, updated_at, updated_by",
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create secret.");
    }

    row = data as SecretRow;

    await writeAuditLog(admin, {
      secretId: row.id,
      keyName,
      action: "created",
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
    });
  }

  setCachedSecret(keyName, input.value.trim());

  return mapSecretRow(row, input.value.trim());
}

export async function deleteSecret(
  admin: SupabaseClient,
  keyName: string,
  options?: {
    actorUserId?: string | null;
    actorEmail?: string;
  },
): Promise<void> {
  const { data: existing } = await admin
    .from("app_secrets")
    .select("id")
    .eq("key_name", keyName)
    .maybeSingle();

  const row = existing as { id: string } | null;

  if (!row?.id) {
    return;
  }

  const { error } = await admin.from("app_secrets").delete().eq("id", row.id);

  if (error) {
    throw new Error(error.message);
  }

  deleteCachedSecret(keyName);

  await writeAuditLog(admin, {
    secretId: row.id,
    keyName,
    action: "deleted",
    actorUserId: options?.actorUserId,
    actorEmail: options?.actorEmail,
  });
}

export async function listSecretAuditLog(
  admin: SupabaseClient,
  limit = 100,
): Promise<AppSecretAuditRecord[]> {
  const { data, error } = await admin
    .from("app_secret_audit_log")
    .select(
      "id, secret_id, key_name, action, actor_user_id, actor_email, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AuditRow[]).map((row) => ({
    id: row.id,
    secretId: row.secret_id,
    keyName: row.key_name,
    action: row.action,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}

export async function recordSecretTest(
  admin: SupabaseClient,
  input: {
    keyName: string;
    actorUserId?: string | null;
    actorEmail?: string;
    success: boolean;
    message: string;
  },
): Promise<void> {
  const { data: existing } = await admin
    .from("app_secrets")
    .select("id")
    .eq("key_name", input.keyName)
    .maybeSingle();

  await writeAuditLog(admin, {
    secretId: (existing as { id: string } | null)?.id ?? null,
    keyName: input.keyName,
    action: "tested",
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    metadata: {
      success: input.success,
      message: input.message,
    },
  });
}

export async function isPlatformAdmin(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

/**
 * Re-encrypts every stored secret with the current primary `ENCRYPTION_KEY`.
 *
 * Used during key rotation: each row is decrypted (trying the primary key, then
 * `ENCRYPTION_KEY_PREVIOUS`) and written back encrypted with the primary key.
 * Idempotent — safe to run multiple times. After it completes for all rows you
 * can remove `ENCRYPTION_KEY_PREVIOUS`.
 */
export async function reEncryptAllSecrets(
  admin: SupabaseClient,
): Promise<{ total: number; reEncrypted: number; failed: number }> {
  const { data, error } = await admin
    .from("app_secrets")
    .select("id, key_name, encrypted_value");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    key_name: string;
    encrypted_value: string;
  }>;

  const primary = getEncryptionKeyFromEnv();
  let reEncrypted = 0;
  let failed = 0;

  for (const row of rows) {
    let plaintext: string;

    try {
      plaintext = decryptSecretValueWithRotation(row.encrypted_value);
    } catch {
      console.warn(`[rotate] could not decrypt ${row.key_name}, skipping`);
      failed += 1;
      continue;
    }

    const { error: updateError } = await admin
      .from("app_secrets")
      .update({ encrypted_value: encryptSecretValue(plaintext, primary) })
      .eq("id", row.id);

    if (updateError) {
      console.warn(`[rotate] failed to update ${row.key_name}: ${updateError.message}`);
      failed += 1;
      continue;
    }

    reEncrypted += 1;
  }

  return { total: rows.length, reEncrypted, failed };
}
