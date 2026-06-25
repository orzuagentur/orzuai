import type { SupabaseClient } from "@supabase/supabase-js";

import {
  decryptSecretValue,
  encryptSecretValue,
  getEncryptionKeyFromEnv,
} from "./crypto";
import { maskSecretValue } from "./mask";
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

const CACHE_TTL_MS = 60_000;

let secretCache = new Map<string, string>();
let cacheExpiresAt = 0;

export function clearSecretCache(): void {
  secretCache = new Map();
  cacheExpiresAt = 0;
}

export async function warmSecretCache(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin
    .from("app_secrets")
    .select("key_name, encrypted_value, is_active");

  if (error) {
    throw new Error(error.message);
  }

  const encryptionKey = getEncryptionKeyFromEnv();
  const nextCache = new Map<string, string>();

  for (const row of (data ?? []) as Array<{
    key_name: string;
    encrypted_value: string;
    is_active: boolean;
  }>) {
    if (!row.is_active) {
      continue;
    }

    try {
      nextCache.set(
        row.key_name,
        decryptSecretValue(row.encrypted_value, encryptionKey),
      );
    } catch {
      // Skip invalid ciphertext rows during cache warm.
    }
  }

  secretCache = nextCache;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return nextCache.size;
}

export function resolveSecretFromCache(keyName: string): string | undefined {
  if (Date.now() > cacheExpiresAt) {
    return undefined;
  }

  return secretCache.get(keyName);
}

export function resolveSecretValue(
  keyName: string,
  options?: { required?: boolean },
): string | undefined {
  const fromCache = resolveSecretFromCache(keyName);
  const fromEnv = process.env[keyName]?.trim();
  const value = fromCache ?? fromEnv;

  if (!value && options?.required) {
    throw new Error(`Missing required secret: ${keyName}`);
  }

  return value || undefined;
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
  const encryptionKey = getEncryptionKeyFromEnv();
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
      decrypted = decryptSecretValue(row.encrypted_value, encryptionKey);
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

  const value = decryptSecretValue(row.encrypted_value, getEncryptionKeyFromEnv());

  secretCache.set(keyName, value);
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

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

  secretCache.set(keyName, input.value.trim());
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

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

  secretCache.delete(keyName);

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
