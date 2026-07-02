import "server-only";

import {
  PLATFORM_AI_USE_CASES,
  VERCEL_AI_SECRET_BINDINGS,
  getDefaultModelForProvider,
  getVercelAiCredentialName,
  isLlmProvider,
  resolveModelForProvider,
} from "@orzu/platform-ai";
import {
  collectMigratableEnvKeys,
  isMigratableAppSecretKey,
} from "@orzu/secrets/bootstrap";
import { getSecret, setSecret, warmSecretCache } from "@orzu/secrets/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VercelSyncSource = "runtime_env" | "vercel_api";

/** Main OrzuX web app on Vercel (orzux.com) — not the admin project. */
const DEFAULT_VERCEL_SYNC_PROJECT_NAME = "orzuaibot";

export type VercelSyncTargetProject = {
  id: string;
  name: string;
};

export type VercelSecretsSyncResult = {
  success: true;
  targetProject: VercelSyncTargetProject;
  sources: VercelSyncSource[];
  secrets: {
    created: string[];
    updated: string[];
    skipped: string[];
    missing: string[];
  };
  aiCredentials: {
    created: string[];
    updated: string[];
    skipped: string[];
  };
  useCasesLinked: string[];
  warnings: string[];
};

type VercelEnvRow = {
  key?: string;
  value?: string;
  target?: string[];
};

type VercelProjectSummary = {
  id?: string;
  name?: string;
};

function getVercelAccessToken(): string | null {
  return (
    process.env.VERCEL_ACCESS_TOKEN?.trim() ||
    process.env.VERCEL_TOKEN?.trim() ||
    null
  );
}

function buildVercelTeamQuery(teamId: string | undefined): string {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

async function fetchVercelProjectById(input: {
  token: string;
  projectId: string;
  teamId?: string;
}): Promise<VercelProjectSummary | null> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(input.projectId)}${buildVercelTeamQuery(input.teamId)}`,
    {
      headers: { Authorization: `Bearer ${input.token}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as VercelProjectSummary;
}

async function fetchVercelProjectByName(input: {
  token: string;
  projectName: string;
  teamId?: string;
}): Promise<VercelSyncTargetProject | null> {
  const response = await fetch(
    `https://api.vercel.com/v9/projects${buildVercelTeamQuery(input.teamId)}`,
    {
      headers: { Authorization: `Bearer ${input.token}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body.slice(0, 300) ||
        `Vercel projects API failed (${response.status} ${response.statusText}).`,
    );
  }

  const payload = (await response.json()) as { projects?: VercelProjectSummary[] };
  const match = (payload.projects ?? []).find(
    (project) => project.name === input.projectName && project.id,
  );

  if (!match?.id) {
    return null;
  }

  return { id: match.id, name: match.name ?? input.projectName };
}

async function resolveVercelSyncTargetProject(): Promise<VercelSyncTargetProject> {
  const token = getVercelAccessToken();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const configuredId = process.env.VERCEL_SYNC_PROJECT_ID?.trim();
  const configuredName =
    process.env.VERCEL_SYNC_PROJECT_NAME?.trim() ||
    DEFAULT_VERCEL_SYNC_PROJECT_NAME;

  if (configuredId) {
    if (token) {
      const project = await fetchVercelProjectById({
        token,
        projectId: configuredId,
        teamId,
      });

      if (project?.id) {
        return {
          id: project.id,
          name: project.name ?? configuredName,
        };
      }
    }

    return { id: configuredId, name: configuredName };
  }

  if (!token) {
    throw new Error(
      "Укажите VERCEL_ACCESS_TOKEN и VERCEL_SYNC_PROJECT_ID (orzuaibot) в env админки. Синхронизация идёт из основного проекта orzux.com, не из orzuai-admin.",
    );
  }

  const project = await fetchVercelProjectByName({
    token,
    projectName: configuredName,
    teamId,
  });

  if (!project) {
    throw new Error(
      `Vercel проект «${configuredName}» не найден. Укажите VERCEL_SYNC_PROJECT_ID=prj_1pZTdfXPPP2hiY4uGAWjBtqwLzBa.`,
    );
  }

  return project;
}

function shouldIncludeRuntimeEnv(targetProject: VercelSyncTargetProject): boolean {
  if (process.env.VERCEL_SYNC_INCLUDE_RUNTIME_ENV === "true") {
    return true;
  }

  const currentProjectId = process.env.VERCEL_PROJECT_ID?.trim();
  return !!currentProjectId && currentProjectId === targetProject.id;
}

function mergeEnvMaps(
  primary: Map<string, string>,
  secondary: Map<string, string>,
): Map<string, string> {
  const merged = new Map(primary);

  for (const [key, value] of secondary) {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  }

  return merged;
}

async function fetchVercelProjectEnvMap(
  targetProject: VercelSyncTargetProject,
): Promise<Map<string, string>> {
  const token = getVercelAccessToken();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token) {
    throw new Error(
      "VERCEL_ACCESS_TOKEN не задан. Добавьте токен в env проекта orzuai-admin для чтения ключей из orzuaibot.",
    );
  }

  const url = new URL(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(targetProject.id)}/env`,
  );
  url.searchParams.set("decrypt", "true");
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body.slice(0, 300) ||
        `Vercel env API failed (${response.status} ${response.statusText}).`,
    );
  }

  const payload = (await response.json()) as { envs?: VercelEnvRow[] };
  const envs = payload.envs ?? [];
  const byKey = new Map<string, { value: string; rank: number }>();

  for (const row of envs) {
    const key = row.key?.trim();
    const value = row.value?.trim();

    if (!key || !value || !isMigratableAppSecretKey(key)) {
      continue;
    }

    const targets = row.target ?? [];
    const rank = targets.includes("production")
      ? 0
      : targets.includes("preview")
        ? 1
        : 2;

    const existing = byKey.get(key);
    if (!existing || rank < existing.rank) {
      byKey.set(key, { value, rank });
    }
  }

  return new Map(
    [...byKey.entries()].map(([key, entry]) => [key, entry.value]),
  );
}

function collectRuntimeEnvMap(): Map<string, string> {
  return new Map(
    collectMigratableEnvKeys(process.env).map((entry) => [
      entry.key,
      entry.value,
    ]),
  );
}

async function resolveSyncEnvMap(): Promise<{
  envMap: Map<string, string>;
  sources: VercelSyncSource[];
  warnings: string[];
  targetProject: VercelSyncTargetProject;
}> {
  const warnings: string[] = [];
  const sources: VercelSyncSource[] = [];
  const targetProject = await resolveVercelSyncTargetProject();
  const includeRuntime = shouldIncludeRuntimeEnv(targetProject);
  const runtimeMap = includeRuntime ? collectRuntimeEnvMap() : new Map<string, string>();

  if (includeRuntime && runtimeMap.size > 0) {
    sources.push("runtime_env");
  } else if (!includeRuntime && collectRuntimeEnvMap().size > 0) {
    warnings.push(
      `Runtime env админки (orzuai-admin) пропущен. Источник: Vercel проект «${targetProject.name}» (${targetProject.id}).`,
    );
  }

  const vercelApiMap = await fetchVercelProjectEnvMap(targetProject);
  if (vercelApiMap.size > 0) {
    sources.push("vercel_api");
  }

  const envMap = includeRuntime
    ? mergeEnvMaps(vercelApiMap, runtimeMap)
    : vercelApiMap;

  if (envMap.size === 0) {
    warnings.push(
      `Не найдено ключей в Vercel проекте «${targetProject.name}». Добавьте переменные в orzuaibot (orzux.com).`,
    );
  }

  return { envMap, sources, warnings, targetProject };
}

async function importSecretsToVault(input: {
  supabase: SupabaseClient;
  envMap: Map<string, string>;
  actorUserId: string;
  actorEmail: string;
}): Promise<VercelSecretsSyncResult["secrets"]> {
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const missing: string[] = [];

  for (const [key, value] of input.envMap) {
    if (!isMigratableAppSecretKey(key) || !value.trim()) {
      skipped.push(key);
      continue;
    }

    const { data: existing } = await input.supabase
      .from("app_secrets")
      .select("id")
      .eq("key_name", key)
      .maybeSingle();

    await setSecret(input.supabase, {
      keyName: key,
      value: value.trim(),
      description: "Synced from Vercel",
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
    });

    if (existing?.id) {
      updated.push(key);
    } else {
      created.push(key);
    }
  }

  for (const binding of VERCEL_AI_SECRET_BINDINGS) {
    if (!input.envMap.has(binding.envKey)) {
      missing.push(binding.envKey);
    }
  }

  return { created, updated, skipped, missing };
}

async function provisionAiCredentials(input: {
  supabase: SupabaseClient;
}): Promise<{
  created: string[];
  updated: string[];
  skipped: string[];
  credentialIdsByProvider: Map<string, string>;
}> {
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const credentialIdsByProvider = new Map<string, string>();

  for (const binding of VERCEL_AI_SECRET_BINDINGS) {
    const secretValue = await getSecret(input.supabase, binding.envKey);

    if (!secretValue?.trim()) {
      skipped.push(binding.provider);
      continue;
    }

    const { data: existingBySecret } = await input.supabase
      .from("platform_ai_credentials")
      .select("id, provider, name")
      .eq("secret_key_name", binding.envKey)
      .maybeSingle();

    if (existingBySecret?.id) {
      await input.supabase
        .from("platform_ai_credentials")
        .update({
          name: getVercelAiCredentialName(binding),
          provider: binding.provider,
          is_active: true,
        })
        .eq("id", existingBySecret.id);

      credentialIdsByProvider.set(binding.provider, existingBySecret.id);
      updated.push(binding.provider);
      continue;
    }

    const { data: existingByProvider } = await input.supabase
      .from("platform_ai_credentials")
      .select("id")
      .eq("provider", binding.provider)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existingByProvider?.id) {
      await input.supabase
        .from("platform_ai_credentials")
        .update({
          name: getVercelAiCredentialName(binding),
          secret_key_name: binding.envKey,
          is_active: true,
        })
        .eq("id", existingByProvider.id);

      credentialIdsByProvider.set(binding.provider, existingByProvider.id);
      updated.push(binding.provider);
      continue;
    }

    const { data: inserted, error } = await input.supabase
      .from("platform_ai_credentials")
      .insert({
        name: getVercelAiCredentialName(binding),
        provider: binding.provider,
        secret_key_name: binding.envKey,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !inserted?.id) {
      skipped.push(binding.provider);
      continue;
    }

    credentialIdsByProvider.set(binding.provider, inserted.id);
    created.push(binding.provider);
  }

  return { created, updated, skipped, credentialIdsByProvider };
}

async function linkUseCasesToCredentials(input: {
  supabase: SupabaseClient;
  credentialIdsByProvider: Map<string, string>;
}): Promise<string[]> {
  const linked: string[] = [];

  const { data: configs } = await input.supabase
    .from("platform_ai_use_case_config")
    .select("use_case_id, credential_id, provider, model");

  const configMap = new Map(
    (configs ?? []).map((row) => [row.use_case_id as string, row]),
  );

  for (const useCase of PLATFORM_AI_USE_CASES) {
    const existing = configMap.get(useCase.id);
    const provider = existing?.provider ?? useCase.defaultProvider;

    if (existing?.credential_id) {
      continue;
    }

    const credentialId =
      input.credentialIdsByProvider.get(provider) ??
      input.credentialIdsByProvider.get(useCase.defaultProvider) ??
      null;

    if (!credentialId) {
      continue;
    }

    const model = isLlmProvider(provider)
      ? resolveModelForProvider(
          provider,
          existing?.model ??
            useCase.defaultModel ??
            getDefaultModelForProvider(provider),
        )
      : null;

    await input.supabase.from("platform_ai_use_case_config").upsert(
      {
        use_case_id: useCase.id,
        credential_id: credentialId,
        provider,
        model,
      },
      { onConflict: "use_case_id" },
    );

    linked.push(useCase.id);
  }

  return linked;
}

export async function syncVercelSecretsAndAiCredentials(input: {
  supabase: SupabaseClient;
  actorUserId: string;
  actorEmail: string;
}): Promise<VercelSecretsSyncResult> {
  const { envMap, sources, warnings, targetProject } = await resolveSyncEnvMap();

  const secrets = await importSecretsToVault({
    supabase: input.supabase,
    envMap,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
  });

  await warmSecretCache(input.supabase);

  const aiCredentials = await provisionAiCredentials({
    supabase: input.supabase,
  });

  const useCasesLinked = await linkUseCasesToCredentials({
    supabase: input.supabase,
    credentialIdsByProvider: aiCredentials.credentialIdsByProvider,
  });

  return {
    success: true,
    targetProject,
    sources,
    secrets,
    aiCredentials: {
      created: aiCredentials.created,
      updated: aiCredentials.updated,
      skipped: aiCredentials.skipped,
    },
    useCasesLinked,
    warnings,
  };
}
