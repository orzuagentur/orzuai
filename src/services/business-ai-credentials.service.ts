import "server-only";

import { deleteSecret, getSecret, setSecret } from "@orzu/secrets/server";
import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { AiProvider } from "@/lib/ai/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type BusinessProviderCredential = {
  provider: AiProvider;
  configured: boolean;
  keyName: string | null;
  keyPreview: string | null;
  updatedAt: string | null;
};

export type BusinessAiKeysSettings = {
  credentials: BusinessProviderCredential[];
  preferCustomerAiKeys: boolean;
};

type BusinessAiProviderKeyRow = {
  business_id: string;
  provider: string;
  api_key: string | null;
  secret_key_name: string | null;
  api_key_preview: string | null;
  key_name: string | null;
  updated_at: string | null;
};

function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();

  if (trimmed.length <= 8) {
    return "••••••••";
  }

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

function revalidateAiKeyPaths(): void {
  revalidatePath(DASHBOARD_ROUTES.settings);
  revalidatePath(DASHBOARD_ROUTES.aiAssistant);
}

function buildBusinessProviderSecretKeyName(
  businessId: string,
  provider: AiProvider,
): string {
  const safeBusinessId = businessId.replace(/-/g, "_").toUpperCase();
  return `BUSINESS_AI_PROVIDER_KEY_${safeBusinessId}_${provider.toUpperCase()}`;
}

async function migrateLegacyBusinessProviderKey(
  admin: ReturnType<typeof createAdminClient>,
  row: BusinessAiProviderKeyRow,
): Promise<{ secretKeyName: string | null; preview: string | null }> {
  const legacyApiKey = row.api_key?.trim();

  if (!legacyApiKey) {
    return {
      secretKeyName: row.secret_key_name,
      preview: row.api_key_preview,
    };
  }

  const provider = row.provider as AiProvider;
  const secretKeyName =
    row.secret_key_name ??
    buildBusinessProviderSecretKeyName(row.business_id, provider);
  const preview = maskApiKey(legacyApiKey);

  try {
    await setSecret(admin, {
      keyName: secretKeyName,
      value: legacyApiKey,
      description: `Customer AI provider key for business ${row.business_id} (${provider})`,
    });

    const { error } = await admin
      .from("business_ai_provider_keys")
      .update({
        api_key: null,
        secret_key_name: secretKeyName,
        api_key_preview: preview,
        encrypted_at: new Date().toISOString(),
      })
      .eq("business_id", row.business_id)
      .eq("provider", provider);

    if (error) {
      throw new Error(error.message);
    }

    return { secretKeyName, preview };
  } catch (error) {
    console.warn(
      "[business-ai-credentials] legacy key migration failed",
      JSON.stringify({
        businessId: row.business_id,
        provider,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    return {
      secretKeyName: row.secret_key_name,
      preview: row.api_key_preview ?? preview,
    };
  }
}

export async function getBusinessPreferCustomerAiKeys(
  businessId: string,
): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("prefer_customer_ai_keys")
    .eq("id", businessId)
    .maybeSingle();

  return data?.prefer_customer_ai_keys ?? false;
}

export async function setBusinessPreferCustomerAiKeys(
  businessId: string,
  preferCustomerAiKeys: boolean,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ prefer_customer_ai_keys: preferCustomerAiKeys })
    .eq("id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateAiKeyPaths();
  return { success: true };
}

export async function listBusinessProviderCredentials(
  businessId: string,
): Promise<BusinessProviderCredential[]> {
  const providers: AiProvider[] = ["gemini", "openai", "claude"];

  if (!hasSupabaseEnv()) {
    return providers.map((provider) => ({
      provider,
      configured: false,
      keyName: null,
      keyPreview: null,
      updatedAt: null,
    }));
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_ai_provider_keys")
    .select(
      "business_id, provider, api_key, secret_key_name, api_key_preview, key_name, updated_at",
    )
    .eq("business_id", businessId);

  const entries = await Promise.all(
    ((data ?? []) as BusinessAiProviderKeyRow[]).map(async (row) => {
      let secretKeyName = row.secret_key_name;
      let preview = row.api_key_preview;

      if (!secretKeyName && row.api_key?.trim()) {
        const migrated = await migrateLegacyBusinessProviderKey(admin, row);
        secretKeyName = migrated.secretKeyName;
        preview = migrated.preview;
      }

      return [
        row.provider as AiProvider,
        {
          configured: Boolean(secretKeyName || row.api_key?.trim()),
          keyName: row.key_name?.trim() || null,
          preview: preview ?? (row.api_key ? maskApiKey(row.api_key) : null),
          updatedAt: row.updated_at,
        },
      ] as const;
    }),
  );
  const byProvider = new Map(entries);

  return providers.map((provider) => {
    const entry = byProvider.get(provider);

    return {
      provider,
      configured: Boolean(entry?.configured),
      keyName: entry?.keyName ?? null,
      keyPreview: entry?.preview ?? null,
      updatedAt: entry?.updatedAt ?? null,
    };
  });
}

export async function getBusinessAiKeysSettings(
  businessId: string,
): Promise<BusinessAiKeysSettings> {
  const [credentials, preferCustomerAiKeys] = await Promise.all([
    listBusinessProviderCredentials(businessId),
    getBusinessPreferCustomerAiKeys(businessId),
  ]);

  return { credentials, preferCustomerAiKeys };
}

export async function businessHasCustomAiCredentials(
  businessId: string,
): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    return false;
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("business_ai_provider_keys")
    .select("provider", { count: "exact", head: true })
    .eq("business_id", businessId);

  return (count ?? 0) > 0;
}

export async function getBusinessProviderApiKey(
  businessId: string,
  provider: AiProvider,
): Promise<string | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_ai_provider_keys")
    .select(
      "business_id, provider, api_key, secret_key_name, api_key_preview, key_name, updated_at",
    )
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();

  const row = data as BusinessAiProviderKeyRow | null;

  if (!row) {
    return null;
  }

  if (row.secret_key_name) {
    try {
      const secret = await getSecret(admin, row.secret_key_name);

      if (secret?.trim()) {
        return secret.trim();
      }
    } catch (error) {
      console.warn(
        "[business-ai-credentials] encrypted key read failed",
        JSON.stringify({
          businessId,
          provider,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }
  }

  const legacyApiKey = row.api_key?.trim();

  if (legacyApiKey) {
    await migrateLegacyBusinessProviderKey(admin, row);
    return legacyApiKey;
  }

  return null;
}

export async function saveBusinessProviderApiKey(
  businessId: string,
  provider: AiProvider,
  apiKey: string,
  options?: {
    keyName?: string;
    useForAllAgents?: boolean;
    actorUserId?: string | null;
    actorEmail?: string;
  },
): Promise<{ success: boolean; message?: string }> {
  const trimmed = apiKey.trim();
  const keyName = options?.keyName?.trim();

  if (!trimmed) {
    return { success: false, message: "API key is required." };
  }

  if (!keyName) {
    return { success: false, message: "Key name is required." };
  }

  if (keyName.length > 80) {
    return { success: false, message: "Key name must be 80 characters or less." };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const admin = createAdminClient();
  const secretKeyName = buildBusinessProviderSecretKeyName(businessId, provider);

  try {
    await setSecret(admin, {
      keyName: secretKeyName,
      value: trimmed,
      description: `Customer AI provider key for business ${businessId} (${provider})`,
      actorUserId: options?.actorUserId,
      actorEmail: options?.actorEmail,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to encrypt and store API key.",
    };
  }

  const { error } = await admin.from("business_ai_provider_keys").upsert(
    {
      business_id: businessId,
      provider,
      api_key: null,
      secret_key_name: secretKeyName,
      api_key_preview: maskApiKey(trimmed),
      encrypted_at: new Date().toISOString(),
      key_name: keyName,
    },
    { onConflict: "business_id,provider" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  if (options?.useForAllAgents !== false) {
    await admin
      .from("businesses")
      .update({ prefer_customer_ai_keys: true })
      .eq("id", businessId);
  }

  revalidateAiKeyPaths();
  return { success: true };
}

export async function deleteBusinessProviderApiKey(
  businessId: string,
  provider: AiProvider,
  options?: {
    actorUserId?: string | null;
    actorEmail?: string;
  },
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("business_ai_provider_keys")
    .select("secret_key_name")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();

  const secretKeyName =
    existing?.secret_key_name ??
    buildBusinessProviderSecretKeyName(businessId, provider);

  const { error } = await admin
    .from("business_ai_provider_keys")
    .delete()
    .eq("business_id", businessId)
    .eq("provider", provider);

  if (error) {
    return { success: false, message: error.message };
  }

  try {
    await deleteSecret(admin, secretKeyName, {
      actorUserId: options?.actorUserId,
      actorEmail: options?.actorEmail,
    });
  } catch (deleteError) {
    console.warn(
      "[business-ai-credentials] encrypted key delete failed",
      JSON.stringify({
        businessId,
        provider,
        error: deleteError instanceof Error ? deleteError.message : "unknown",
      }),
    );
  }

  const remaining = await listBusinessProviderCredentials(businessId);
  const hasAnyKey = remaining.some((credential) => credential.configured);

  if (!hasAnyKey) {
    await admin
      .from("businesses")
      .update({ prefer_customer_ai_keys: false })
      .eq("id", businessId);
  }

  revalidateAiKeyPaths();
  return { success: true };
}

export type ResolvedLlmCredentials = {
  apiKey: string | null;
  billingSource: "platform" | "customer";
  usesBusinessKey: boolean;
};

export async function resolveBusinessLlmCredentials(
  businessId: string | undefined,
  provider: AiProvider,
): Promise<ResolvedLlmCredentials> {
  if (businessId) {
    const [preferCustomer, businessKey] = await Promise.all([
      getBusinessPreferCustomerAiKeys(businessId),
      getBusinessProviderApiKey(businessId, provider),
    ]);

    if (preferCustomer && businessKey) {
      return {
        apiKey: businessKey,
        billingSource: "customer",
        usesBusinessKey: true,
      };
    }
  }

  return {
    apiKey: null,
    billingSource: "platform",
    usesBusinessKey: false,
  };
}
