import "server-only";

import {
  PLATFORM_AI_USE_CASES,
  resolveUseCaseIdForCallType,
  type PlatformAiCredentialRecord,
  type PlatformAiUseCaseConfigRecord,
  buildPlatformAiCredentialKeyName,
  getDefaultModelForProvider,
  isLlmProvider,
  resolveModelForProvider,
} from "@orzu/platform-ai";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiCallType } from "@/lib/ai/call-types";
import type { AiProvider } from "@/lib/ai/constants";
import { DEFAULT_LLM_FALLBACK_PROVIDERS } from "@/lib/ai/call-types";
import { hasClaudeEnv, hasGeminiEnv, hasOpenAiEnv } from "@/lib/env";

type CredentialRow = {
  id: string;
  name: string;
  provider: string;
  secret_key_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type UseCaseConfigRow = {
  use_case_id: string;
  credential_id: string | null;
  provider: string;
  model: string | null;
  updated_at: string;
};

export type ResolvedPlatformAiConfig = {
  useCaseId: string;
  provider: AiProvider | "elevenlabs" | "deepgram";
  model: string | null;
  secretKeyName: string | null;
  apiKey: string | null;
};

const CACHE_TTL_MS = 60_000;

let credentialsCache: {
  expiresAt: number;
  rows: PlatformAiCredentialRecord[];
} | null = null;

let useCaseCache: {
  expiresAt: number;
  rows: PlatformAiUseCaseConfigRecord[];
} | null = null;

function mapCredential(row: CredentialRow): PlatformAiCredentialRecord {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    secretKeyName: row.secret_key_name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUseCaseConfig(row: UseCaseConfigRow): PlatformAiUseCaseConfigRecord {
  return {
    useCaseId: row.use_case_id,
    credentialId: row.credential_id,
    provider: row.provider,
    model: row.model,
    updatedAt: row.updated_at,
  };
}

export async function listPlatformAiCredentials(): Promise<
  PlatformAiCredentialRecord[]
> {
  if (credentialsCache && credentialsCache.expiresAt > Date.now()) {
    return credentialsCache.rows;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_ai_credentials")
    .select(
      "id, name, provider, secret_key_name, is_active, created_at, updated_at",
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as CredentialRow[]).map(mapCredential);
  credentialsCache = { expiresAt: Date.now() + CACHE_TTL_MS, rows };
  return rows;
}

export async function listPlatformAiUseCaseConfigs(): Promise<
  PlatformAiUseCaseConfigRecord[]
> {
  if (useCaseCache && useCaseCache.expiresAt > Date.now()) {
    return useCaseCache.rows;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_ai_use_case_config")
    .select("use_case_id, credential_id, provider, model, updated_at");

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as UseCaseConfigRow[]).map(mapUseCaseConfig);
  useCaseCache = { expiresAt: Date.now() + CACHE_TTL_MS, rows };
  return rows;
}

export function invalidatePlatformAiConfigCache(): void {
  credentialsCache = null;
  useCaseCache = null;
}

function resolveLegacySecretKey(provider: string): string | null {
  if (provider === "openai") {
    return "OPENAI_API_KEY";
  }

  if (provider === "claude") {
    return "ANTHROPIC_API_KEY";
  }

  if (provider === "gemini") {
    return "GEMINI_API_KEY";
  }

  if (provider === "elevenlabs") {
    return "ELEVENLABS_API_KEY";
  }

  if (provider === "deepgram") {
    return "DEEPGRAM_API_KEY";
  }

  return null;
}

async function resolveCredentialSecretKey(input: {
  provider: string;
  credentialId: string | null;
  credentials: PlatformAiCredentialRecord[];
}): Promise<string | null> {
  if (input.credentialId) {
    const selected = input.credentials.find(
      (entry) => entry.id === input.credentialId && entry.isActive,
    );

    if (selected) {
      return selected.secretKeyName;
    }
  }

  const providerCredential = input.credentials.find(
    (entry) => entry.provider === input.provider && entry.isActive,
  );

  if (providerCredential) {
    return providerCredential.secretKeyName;
  }

  return resolveLegacySecretKey(input.provider);
}

export async function resolvePlatformAiForUseCase(
  useCaseId: string,
): Promise<ResolvedPlatformAiConfig | null> {
  const definition = PLATFORM_AI_USE_CASES.find(
    (entry) => entry.id === useCaseId,
  );

  if (!definition) {
    return null;
  }

  const [credentials, configs] = await Promise.all([
    listPlatformAiCredentials(),
    listPlatformAiUseCaseConfigs(),
  ]);

  const saved = configs.find((entry) => entry.useCaseId === useCaseId);
  const provider = saved?.provider ?? definition.defaultProvider;
  const model = isLlmProvider(provider)
    ? resolveModelForProvider(
        provider,
        saved?.model ?? definition.defaultModel ?? null,
      )
    : null;

  const secretKeyName = await resolveCredentialSecretKey({
    provider,
    credentialId: saved?.credentialId ?? null,
    credentials,
  });

  const apiKey = secretKeyName
    ? resolveSecretValue(secretKeyName) ?? null
    : null;

  return {
    useCaseId,
    provider: provider as ResolvedPlatformAiConfig["provider"],
    model,
    secretKeyName,
    apiKey,
  };
}

export async function resolvePlatformAiForCallType(
  callType: AiCallType,
): Promise<ResolvedPlatformAiConfig | null> {
  const useCaseId = resolveUseCaseIdForCallType(callType);

  if (!useCaseId) {
    return null;
  }

  return resolvePlatformAiForUseCase(useCaseId);
}

export async function getConfiguredLlmProviders(): Promise<AiProvider[]> {
  const credentials = await listPlatformAiCredentials();

  const fromVault = credentials
    .filter((entry) => entry.isActive && isLlmProvider(entry.provider))
    .map((entry) => entry.provider as AiProvider);

  const fromEnv: AiProvider[] = [];
  if (hasGeminiEnv()) {
    fromEnv.push("gemini");
  }
  if (hasOpenAiEnv()) {
    fromEnv.push("openai");
  }
  if (hasClaudeEnv()) {
    fromEnv.push("claude");
  }

  const unique = [...new Set([...fromVault, ...fromEnv])];

  return unique.length > 0 ? unique : [...DEFAULT_LLM_FALLBACK_PROVIDERS];
}

export async function getPlatformAiFallbackProviders(
  callType?: AiCallType,
): Promise<AiProvider[]> {
  const configured = await getConfiguredLlmProviders();

  if (callType) {
    const resolved = await resolvePlatformAiForCallType(callType);

    if (resolved && isLlmProvider(resolved.provider)) {
      const primary = resolved.provider as AiProvider;
      return [primary, ...configured.filter((provider) => provider !== primary)];
    }
  }

  const channelDefault = await resolvePlatformAiForUseCase("channel_messages");

  if (channelDefault && isLlmProvider(channelDefault.provider)) {
    const primary = channelDefault.provider as AiProvider;
    return [primary, ...configured.filter((provider) => provider !== primary)];
  }

  return configured;
}

export function generatePlatformAiCredentialKeyName(
  credentialId: string,
): string {
  return buildPlatformAiCredentialKeyName(credentialId);
}

export function getDefaultUseCaseSeedConfigs(): Array<{
  useCaseId: string;
  provider: string;
  model: string | null;
}> {
  return PLATFORM_AI_USE_CASES.map((entry) => ({
    useCaseId: entry.id,
    provider: entry.defaultProvider,
    model:
      entry.kind === "llm" && isLlmProvider(entry.defaultProvider)
        ? resolveModelForProvider(
            entry.defaultProvider,
            entry.defaultModel ?? getDefaultModelForProvider(entry.defaultProvider),
          )
        : null,
  }));
}
