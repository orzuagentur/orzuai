"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/supabase/server";
import {
  deleteSecret,
  getSecret,
  listSecretAuditLog,
  listSecrets,
  recordSecretTest,
  setSecret,
} from "@orzu/secrets/server";

const upsertSchema = z.object({
  keyName: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]*$/, "Invalid key name"),
  value: z.string().trim().min(1).max(20_000),
  description: z.string().trim().max(500).optional(),
});

export async function fetchSecretsAction() {
  const { supabase } = await requirePlatformAdmin();
  const secrets = await listSecrets(supabase);
  return { success: true as const, secrets };
}

export async function fetchAuditLogAction() {
  const { supabase } = await requirePlatformAdmin();
  const entries = await listSecretAuditLog(supabase, 200);
  return { success: true as const, entries };
}

export async function upsertSecretAction(input: z.infer<typeof upsertSchema>) {
  const parsed = upsertSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, user } = await requirePlatformAdmin();

  const secret = await setSecret(supabase, {
    keyName: parsed.data.keyName,
    value: parsed.data.value,
    description: parsed.data.description,
    actorUserId: user.id,
    actorEmail: user.email ?? "",
  });

  revalidatePath("/settings/secrets");
  return { success: true as const, secret };
}

export async function deleteSecretAction(keyName: string) {
  const { supabase, user } = await requirePlatformAdmin();
  await deleteSecret(supabase, keyName, {
    actorUserId: user.id,
    actorEmail: user.email ?? "",
  });
  revalidatePath("/settings/secrets");
  return { success: true as const };
}

export async function revealSecretAction(keyName: string) {
  const { supabase, user } = await requirePlatformAdmin();
  const value = await getSecret(supabase, keyName, {
    actorUserId: user.id,
    actorEmail: user.email ?? "",
    auditView: true,
  });

  if (!value) {
    return { success: false as const, message: "Secret not found" };
  }

  return { success: true as const, value };
}

export async function testSecretAction(keyName: string) {
  const { supabase, user } = await requirePlatformAdmin();
  const value = await getSecret(supabase, keyName);

  const success = Boolean(value?.trim());
  const message = success
    ? "Секрет найден и доступен для чтения."
    : "Секрет пустой или не найден.";

  await recordSecretTest(supabase, {
    keyName,
    actorUserId: user.id,
    actorEmail: user.email ?? "",
    success,
    message,
  });

  return { success: true as const, tested: success, message };
}
