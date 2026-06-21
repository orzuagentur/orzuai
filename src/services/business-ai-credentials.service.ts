import "server-only";

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
    .select("provider, api_key, key_name, updated_at")
    .eq("business_id", businessId);

  const byProvider = new Map(
    (data ?? []).map((row) => [
      row.provider as AiProvider,
      {
        keyName: row.key_name?.trim() || null,
        preview: maskApiKey(row.api_key),
        updatedAt: row.updated_at,
      },
    ]),
  );

  return providers.map((provider) => {
    const entry = byProvider.get(provider);

    return {
      provider,
      configured: Boolean(entry),
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
    .select("api_key")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key?.trim() || null;
}

export async function saveBusinessProviderApiKey(
  businessId: string,
  provider: AiProvider,
  apiKey: string,
  options?: { keyName?: string; useForAllAgents?: boolean },
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

  const supabase = await createClient();
  const { error } = await supabase.from("business_ai_provider_keys").upsert(
    {
      business_id: businessId,
      provider,
      api_key: trimmed,
      key_name: keyName,
    },
    { onConflict: "business_id,provider" },
  );

  if (error) {
    return { success: false, message: error.message };
  }

  if (options?.useForAllAgents !== false) {
    await supabase
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
): Promise<{ success: boolean; message?: string }> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: "Database is not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_ai_provider_keys")
    .delete()
    .eq("business_id", businessId)
    .eq("provider", provider);

  if (error) {
    return { success: false, message: error.message };
  }

  const remaining = await listBusinessProviderCredentials(businessId);
  const hasAnyKey = remaining.some((credential) => credential.configured);

  if (!hasAnyKey) {
    await supabase
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
