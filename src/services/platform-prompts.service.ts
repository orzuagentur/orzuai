import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import {
  DEFAULT_PLATFORM_PROMPTS,
  type PlatformPromptKey,
} from "@orzu/platform-ai";
import type { Database } from "@/types/database.types";

type DbClient = SupabaseClient<Database>;

type PromptCacheEntry = {
  content: string;
  version: number;
};

const CACHE_TTL_MS = 60_000;
const promptCache = new Map<PlatformPromptKey, PromptCacheEntry>();
let cacheLoadedAt = 0;

function isCacheFresh(): boolean {
  return cacheLoadedAt > 0 && Date.now() - cacheLoadedAt < CACHE_TTL_MS;
}

export async function ensurePlatformPromptsLoaded(
  admin: DbClient = createAdminClient(),
): Promise<void> {
  if (!hasSupabaseEnv() || isCacheFresh()) {
    return;
  }

  const { data, error } = await admin
    .from("platform_prompts")
    .select("prompt_key, version, content")
    .eq("is_active", true);

  if (error) {
    console.warn(
      "[platform-prompts] failed to load active prompts",
      error.message,
    );
    cacheLoadedAt = Date.now();
    return;
  }

  for (const key of Object.keys(DEFAULT_PLATFORM_PROMPTS) as PlatformPromptKey[]) {
    promptCache.set(key, {
      content: DEFAULT_PLATFORM_PROMPTS[key],
      version: 0,
    });
  }

  for (const row of data ?? []) {
    const key = row.prompt_key as PlatformPromptKey;

    if (!(key in DEFAULT_PLATFORM_PROMPTS)) {
      continue;
    }

    promptCache.set(key, {
      content: row.content,
      version: row.version,
    });
  }

  cacheLoadedAt = Date.now();
}

export function getPlatformPromptContent(key: PlatformPromptKey): string {
  return promptCache.get(key)?.content ?? DEFAULT_PLATFORM_PROMPTS[key];
}

export function invalidatePlatformPromptCache(): void {
  promptCache.clear();
  cacheLoadedAt = 0;
}

export async function recordPlatformPromptUsage(
  key: PlatformPromptKey,
  admin: DbClient = createAdminClient(),
): Promise<void> {
  if (!hasSupabaseEnv()) {
    return;
  }

  const version = promptCache.get(key)?.version;

  if (!version || version <= 0) {
    return;
  }

  const { error } = await admin.rpc("increment_platform_prompt_usage", {
    p_prompt_key: key,
    p_version: version,
  });

  if (error) {
    console.warn("[platform-prompts] usage increment failed", error.message);
  }
}

export async function touchPlatformPromptUsage(
  keys: PlatformPromptKey[],
  admin?: DbClient,
): Promise<void> {
  const client = admin ?? createAdminClient();
  await Promise.all(keys.map((key) => recordPlatformPromptUsage(key, client)));
}
