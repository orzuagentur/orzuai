"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

import {
  PLATFORM_AI_PROVIDERS,
  PLATFORM_AI_USE_CASES,
  PLATFORM_AI_USE_CASE_CATEGORIES,
  buildPlatformAiCredentialKeyName,
  getDefaultModelForProvider,
  getModelsForProvider,
  isLlmProvider,
  type PlatformAiCredentialRecord,
  type PlatformAiUseCaseConfigRecord,
} from "@orzu/platform-ai";
import { requirePlatformAdmin } from "@/lib/supabase/server";
import { deleteSecret, getSecret, setSecret } from "@orzu/secrets/server";

const credentialSchema = z.object({
  name: z.string().trim().min(2).max(80),
  provider: z.enum(PLATFORM_AI_PROVIDERS),
  apiKey: z.string().trim().min(8).max(20_000),
});

const updateCredentialSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  provider: z.enum(PLATFORM_AI_PROVIDERS),
  apiKey: z.string().trim().max(20_000).optional(),
  isActive: z.boolean(),
});

const useCaseSchema = z.object({
  useCaseId: z.string().trim().min(1),
  provider: z.enum(PLATFORM_AI_PROVIDERS),
  model: z.string().trim().max(120).optional().nullable(),
  credentialId: z.string().uuid().nullable().optional(),
});

type CredentialRow = {
  id: string;
  name: string;
  provider: string;
  secret_key_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type UseCaseRow = {
  use_case_id: string;
  credential_id: string | null;
  provider: string;
  model: string | null;
  updated_at: string;
};

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

function mapUseCase(row: UseCaseRow): PlatformAiUseCaseConfigRecord {
  return {
    useCaseId: row.use_case_id,
    credentialId: row.credential_id,
    provider: row.provider,
    model: row.model,
    updatedAt: row.updated_at,
  };
}

async function isSecretConfigured(
  supabase: Awaited<ReturnType<typeof requirePlatformAdmin>>["supabase"],
  secretKeyName: string,
): Promise<boolean> {
  const value = await getSecret(supabase, secretKeyName);
  return Boolean(value?.trim());
}

export type AiCredentialView = PlatformAiCredentialRecord & {
  configured: boolean;
};

export type AiUseCaseCardView = {
  definition: (typeof PLATFORM_AI_USE_CASES)[number];
  config: PlatformAiUseCaseConfigRecord | null;
  availableProviders: string[];
  availableModels: ReturnType<typeof getModelsForProvider>;
  selectedCredentialConfigured: boolean;
};

export type AiPlatformManagementData = {
  credentials: AiCredentialView[];
  useCaseCards: AiUseCaseCardView[];
  categories: typeof PLATFORM_AI_USE_CASE_CATEGORIES;
};

function revalidateAiManagementPaths() {
  revalidatePath("/ai-management");
  revalidatePath("/ai-management/credentials");
  revalidatePath("/ai-management/use-cases");
}

export async function fetchAiPlatformManagementAction(): Promise<AiPlatformManagementData> {
  const { supabase } = await requirePlatformAdmin();

  const [credentialsResult, useCasesResult] = await Promise.all([
    supabase
      .from("platform_ai_credentials")
      .select(
        "id, name, provider, secret_key_name, is_active, created_at, updated_at",
      )
      .order("name", { ascending: true }),
    supabase
      .from("platform_ai_use_case_config")
      .select("use_case_id, credential_id, provider, model, updated_at"),
  ]);

  if (credentialsResult.error) {
    throw new Error(credentialsResult.error.message);
  }

  if (useCasesResult.error) {
    throw new Error(useCasesResult.error.message);
  }

  const credentials = await Promise.all(
    ((credentialsResult.data ?? []) as CredentialRow[]).map(async (row) => {
      const mapped = mapCredential(row);
      const configured = await isSecretConfigured(supabase, mapped.secretKeyName);

      return {
        ...mapped,
        configured,
      };
    }),
  );

  const configMap = new Map(
    ((useCasesResult.data ?? []) as UseCaseRow[]).map((row) => [
      row.use_case_id,
      mapUseCase(row),
    ]),
  );

  const activeProviders = new Set(
    credentials.filter((entry) => entry.isActive && entry.configured).map(
      (entry) => entry.provider,
    ),
  );

  const useCaseCards: AiUseCaseCardView[] = PLATFORM_AI_USE_CASES.map(
    (definition) => {
      const config = configMap.get(definition.id) ?? null;
      const provider = config?.provider ?? definition.defaultProvider;
      const availableProviders = definition.supportedProviders.filter(
        (entry) => activeProviders.has(entry),
      );

      const selectedCredential = config?.credentialId
        ? credentials.find((entry) => entry.id === config.credentialId)
        : credentials.find(
            (entry) =>
              entry.provider === provider && entry.isActive && entry.configured,
          );

      return {
        definition,
        config,
        availableProviders,
        availableModels: isLlmProvider(provider)
          ? getModelsForProvider(provider)
          : [],
        selectedCredentialConfigured: Boolean(selectedCredential?.configured),
      };
    },
  );

  return {
    credentials,
    useCaseCards,
    categories: PLATFORM_AI_USE_CASE_CATEGORIES,
  };
}

export async function createAiCredentialAction(
  input: z.infer<typeof credentialSchema>,
) {
  const parsed = credentialSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Некорректные данные.",
    };
  }

  const { supabase, user } = await requirePlatformAdmin();
  const credentialId = randomUUID();
  const secretKeyName = buildPlatformAiCredentialKeyName(credentialId);

  await setSecret(supabase, {
    keyName: secretKeyName,
    value: parsed.data.apiKey,
    description: `Platform AI credential: ${parsed.data.name} (${parsed.data.provider})`,
    actorUserId: user.id,
    actorEmail: user.email ?? "",
  });

  const { error } = await supabase.from("platform_ai_credentials").insert({
    id: credentialId,
    name: parsed.data.name,
    provider: parsed.data.provider,
    secret_key_name: secretKeyName,
    is_active: true,
  });

  if (error) {
    await deleteSecret(supabase, secretKeyName, {
      actorUserId: user.id,
      actorEmail: user.email ?? "",
    }).catch(() => undefined);

    return {
      success: false as const,
      message: error.message,
    };
  }

  revalidateAiManagementPaths();

  return { success: true as const };
}

export async function updateAiCredentialAction(
  input: z.infer<typeof updateCredentialSchema>,
) {
  const parsed = updateCredentialSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Некорректные данные.",
    };
  }

  const { supabase, user } = await requirePlatformAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("platform_ai_credentials")
    .select("id, secret_key_name")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false as const, message: fetchError.message };
  }

  const row = existing as { id: string; secret_key_name: string } | null;

  if (!row) {
    return { success: false as const, message: "Ключ не найден." };
  }

  if (parsed.data.apiKey?.trim()) {
    await setSecret(supabase, {
      keyName: row.secret_key_name,
      value: parsed.data.apiKey.trim(),
      description: `Platform AI credential: ${parsed.data.name}`,
      actorUserId: user.id,
      actorEmail: user.email ?? "",
    });
  }

  const { error } = await supabase
    .from("platform_ai_credentials")
    .update({
      name: parsed.data.name,
      provider: parsed.data.provider,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidateAiManagementPaths();

  return { success: true as const };
}

export async function deleteAiCredentialAction(credentialId: string) {
  const { supabase, user } = await requirePlatformAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("platform_ai_credentials")
    .select("id, secret_key_name")
    .eq("id", credentialId)
    .maybeSingle();

  if (fetchError) {
    return { success: false as const, message: fetchError.message };
  }

  const row = existing as { id: string; secret_key_name: string } | null;

  if (!row) {
    return { success: false as const, message: "Ключ не найден." };
  }

  const { error } = await supabase
    .from("platform_ai_credentials")
    .delete()
    .eq("id", credentialId);

  if (error) {
    return { success: false as const, message: error.message };
  }

  await deleteSecret(supabase, row.secret_key_name, {
    actorUserId: user.id,
    actorEmail: user.email ?? "",
  }).catch(() => undefined);

  revalidateAiManagementPaths();

  return { success: true as const };
}

export async function saveAiUseCaseConfigAction(
  input: z.infer<typeof useCaseSchema>,
) {
  const parsed = useCaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Некорректные данные.",
    };
  }

  const definition = PLATFORM_AI_USE_CASES.find(
    (entry) => entry.id === parsed.data.useCaseId,
  );

  if (!definition) {
    return { success: false as const, message: "Сценарий не найден." };
  }

  if (
    !definition.supportedProviders.includes(
      parsed.data.provider as (typeof definition.supportedProviders)[number],
    )
  ) {
    return {
      success: false as const,
      message: "Провайдер не поддерживается для этого сценария.",
    };
  }

  const model = isLlmProvider(parsed.data.provider)
    ? parsed.data.model?.trim() ||
      getDefaultModelForProvider(parsed.data.provider)
    : null;

  const { supabase } = await requirePlatformAdmin();

  const { error } = await supabase.from("platform_ai_use_case_config").upsert(
    {
      use_case_id: parsed.data.useCaseId,
      credential_id: parsed.data.credentialId ?? null,
      provider: parsed.data.provider,
      model,
    },
    { onConflict: "use_case_id" },
  );

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidateAiManagementPaths();

  return { success: true as const };
}

export async function fetchModelsForProviderAction(provider: string) {
  if (!isLlmProvider(provider)) {
    return { success: true as const, models: [] };
  }

  return {
    success: true as const,
    models: getModelsForProvider(provider),
  };
}
