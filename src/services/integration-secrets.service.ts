import "server-only";

import { deleteSecret, getSecret, setSecret } from "@orzu/secrets/server";

import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type IntegrationSecretKind =
  | "WHATSAPP_META_ACCESS_TOKEN"
  | "INSTAGRAM_META_ACCESS_TOKEN"
  | "TELEGRAM_BOT_TOKEN"
  | "TELEGRAM_WEBHOOK_SECRET"
  | "GMAIL_ACCESS_TOKEN"
  | "GMAIL_REFRESH_TOKEN"
  | "GOOGLE_CALENDAR_ACCESS_TOKEN"
  | "GOOGLE_CALENDAR_REFRESH_TOKEN";

function normalizeBusinessId(businessId: string): string {
  return businessId.replace(/-/g, "_").toUpperCase();
}

export function buildIntegrationSecretKeyName(
  businessId: string,
  kind: IntegrationSecretKind,
): string {
  return `INTEGRATION_SECRET_${normalizeBusinessId(businessId)}_${kind}`;
}

export async function storeIntegrationSecret(
  admin: AdminClient,
  input: {
    businessId: string;
    kind: IntegrationSecretKind;
    value: string | null | undefined;
    description?: string;
    actorUserId?: string | null;
    actorEmail?: string;
  },
): Promise<string | null> {
  const value = input.value?.trim();

  if (!value) {
    return null;
  }

  const keyName = buildIntegrationSecretKeyName(input.businessId, input.kind);

  await setSecret(admin, {
    keyName,
    value,
    description:
      input.description ??
      `Encrypted integration secret ${input.kind} for business ${input.businessId}`,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
  });

  return keyName;
}

export async function readIntegrationSecret(
  admin: AdminClient,
  secretKeyName: string | null | undefined,
): Promise<string | null> {
  const keyName = secretKeyName?.trim();

  if (!keyName) {
    return null;
  }

  try {
    return (await getSecret(admin, keyName))?.trim() || null;
  } catch (error) {
    console.warn(
      "[integration-secrets] read failed",
      JSON.stringify({
        keyName,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    return null;
  }
}

export async function resolveIntegrationSecret(
  admin: AdminClient,
  input: {
    businessId: string;
    kind: IntegrationSecretKind;
    secretKeyName?: string | null;
    legacyValue?: string | null;
    description?: string;
    onMigrated?: (secretKeyName: string) => Promise<void>;
  },
): Promise<string | null> {
  const encryptedValue = await readIntegrationSecret(admin, input.secretKeyName);

  if (encryptedValue) {
    return encryptedValue;
  }

  const legacyValue = input.legacyValue?.trim();

  if (!legacyValue) {
    return null;
  }

  const secretKeyName = await storeIntegrationSecret(admin, {
    businessId: input.businessId,
    kind: input.kind,
    value: legacyValue,
    description: input.description,
  });

  if (secretKeyName && input.onMigrated) {
    await input.onMigrated(secretKeyName);
  }

  return legacyValue;
}

export async function deleteIntegrationSecret(
  admin: AdminClient,
  secretKeyName: string | null | undefined,
  options?: {
    actorUserId?: string | null;
    actorEmail?: string;
  },
): Promise<void> {
  const keyName = secretKeyName?.trim();

  if (!keyName) {
    return;
  }

  try {
    await deleteSecret(admin, keyName, options);
  } catch (error) {
    console.warn(
      "[integration-secrets] delete failed",
      JSON.stringify({
        keyName,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
}
