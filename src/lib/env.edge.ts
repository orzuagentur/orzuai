import { ENV_KEYS } from "@/constants/env-keys";

/** Edge/middleware-safe env reads — no secrets package or Node crypto. */

function getRequiredPublicEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseUrl(): string {
  return getRequiredPublicEnv(ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return getRequiredPublicEnv(ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL]?.trim() &&
      process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]?.trim(),
  );
}
