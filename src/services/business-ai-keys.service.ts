import "server-only";

import {
  deleteIntegrationSecret,
  readIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";

export type ByokProvider = "gemini" | "openai";

export type BusinessAiKeySettings = {
  preferCustomerAiKeys: boolean;
  geminiKeyPreview: string | null;
  openaiKeyPreview: string | null;
};

type AdminClient = ReturnType<typeof createAdminClient>;

const PROVIDER_SECRET_KIND = {
  gemini: "BUSINESS_AI_GEMINI_API_KEY",
  openai: "BUSINESS_AI_OPENAI_API_KEY",
} as const;

function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return "********";
  }
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

export async function getBusinessAiKeySettings(
  businessId: string,
): Promise<BusinessAiKeySettings> {
  const defaults: BusinessAiKeySettings = {
    preferCustomerAiKeys: false,
    geminiKeyPreview: null,
    openaiKeyPreview: null,
  };

  if (!hasSupabaseEnv()) {
    return defaults;
  }

  const admin = createAdminClient();
  const [{ data: business }, { data: keys }] = await Promise.all([
    admin
      .from("businesses")
      .select("prefer_customer_ai_keys")
      .eq("id", businessId)
      .maybeSingle(),
    admin
      .from("business_ai_provider_keys")
      .select("provider, api_key_preview")
      .eq("business_id", businessId),
  ]);

  const gemini = keys?.find((row) => row.provider === "gemini");
  const openai = keys?.find((row) => row.provider === "openai");

  return {
    preferCustomerAiKeys: business?.prefer_customer_ai_keys ?? false,
    geminiKeyPreview: gemini?.api_key_preview ?? null,
    openaiKeyPreview: openai?.api_key_preview ?? null,
  };
}

export async function setPreferCustomerAiKeys(
  businessId: string,
  prefer: boolean,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("businesses")
    .update({ prefer_customer_ai_keys: prefer })
    .eq("id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

async function upsertProviderKey(
  admin: AdminClient,
  input: {
    businessId: string;
    provider: ByokProvider;
    apiKey: string;
    actorUserId?: string | null;
  },
): Promise<{ success: boolean; message?: string }> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    return { success: false, message: "API key is required." };
  }

  const { data: existing } = await admin
    .from("business_ai_provider_keys")
    .select("api_key_encrypted")
    .eq("business_id", input.businessId)
    .eq("provider", input.provider)
    .maybeSingle();

  if (existing?.api_key_encrypted) {
    await deleteIntegrationSecret(admin, existing.api_key_encrypted, {
      actorUserId: input.actorUserId,
    });
  }

  const secretKeyName = await storeIntegrationSecret(admin, {
    businessId: input.businessId,
    kind: PROVIDER_SECRET_KIND[input.provider],
    value: apiKey,
    description: `Business ${input.provider} API key for ${input.businessId}`,
    actorUserId: input.actorUserId,
  });

  if (!secretKeyName) {
    return { success: false, message: "Unable to store API key." };
  }

  const { error } = await admin.from("business_ai_provider_keys").upsert(
    {
      business_id: input.businessId,
      provider: input.provider,
      api_key_encrypted: secretKeyName,
      api_key_preview: maskApiKey(apiKey),
    },
    { onConflict: "business_id,provider" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function saveBusinessAiProviderKey(
  businessId: string,
  provider: ByokProvider,
  apiKey: string,
  actorUserId?: string | null,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  return upsertProviderKey(createAdminClient(), {
    businessId,
    provider,
    apiKey,
    actorUserId,
  });
}

export async function clearBusinessAiProviderKey(
  businessId: string,
  provider: ByokProvider,
  actorUserId?: string | null,
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Configuration missing." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("business_ai_provider_keys")
    .select("api_key_encrypted")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();

  if (existing?.api_key_encrypted) {
    await deleteIntegrationSecret(admin, existing.api_key_encrypted, {
      actorUserId,
    });
  }

  const { error } = await admin
    .from("business_ai_provider_keys")
    .delete()
    .eq("business_id", businessId)
    .eq("provider", provider);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function resolveBusinessAiProviderKey(
  businessId: string,
  provider: ByokProvider,
): Promise<string | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("business_ai_provider_keys")
    .select("api_key_encrypted")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();

  if (!data?.api_key_encrypted) {
    return null;
  }

  return readIntegrationSecret(admin, data.api_key_encrypted);
}

export async function businessPrefersCustomerAiKeys(
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

  return data?.prefer_customer_ai_keys === true;
}
