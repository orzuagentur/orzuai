import { ENV_KEYS } from "@/constants/env-keys";
import { getDefaultGeminiModel } from "@/lib/env.schema";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAppUrl(): string {
  return getRequiredEnv(ENV_KEYS.NEXT_PUBLIC_APP_URL);
}

export function getSupabaseUrl(): string {
  return getRequiredEnv(ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return getRequiredEnv(ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey(): string {
  return getRequiredEnv(ENV_KEYS.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL]?.trim() &&
      process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]?.trim() &&
      process.env[ENV_KEYS.SUPABASE_SERVICE_ROLE_KEY]?.trim(),
  );
}

export function getResendApiKey(): string {
  return getRequiredEnv(ENV_KEYS.RESEND_API_KEY);
}

export function getResendFromEmail(): string {
  return getRequiredEnv(ENV_KEYS.RESEND_FROM_EMAIL);
}

export function hasResendEnv(): boolean {
  return Boolean(
    process.env[ENV_KEYS.RESEND_API_KEY]?.trim() &&
      process.env[ENV_KEYS.RESEND_FROM_EMAIL]?.trim(),
  );
}

export function getGeminiApiKey(): string {
  return getRequiredEnv(ENV_KEYS.GEMINI_API_KEY);
}

export function getGeminiDefaultModel(): string {
  return getDefaultGeminiModel();
}

export function hasGeminiEnv(): boolean {
  return Boolean(process.env[ENV_KEYS.GEMINI_API_KEY]?.trim());
}

export function getGoogleClientId(): string | undefined {
  return process.env[ENV_KEYS.GOOGLE_CLIENT_ID]?.trim() || undefined;
}

export function getGoogleClientSecret(): string | undefined {
  return process.env[ENV_KEYS.GOOGLE_CLIENT_SECRET]?.trim() || undefined;
}

export function hasGoogleOAuthEnv(): boolean {
  return Boolean(getGoogleClientId() && getGoogleClientSecret());
}

export function getMetaAppId(): string | undefined {
  return process.env[ENV_KEYS.NEXT_PUBLIC_META_APP_ID]?.trim() || undefined;
}

export function getWhatsAppEmbeddedSignupConfigId(): string | undefined {
  return (
    process.env[ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID]?.trim() ||
    undefined
  );
}

export function hasEmbeddedSignupEnv(): boolean {
  return Boolean(
    getMetaAppId() &&
      getWhatsAppEmbeddedSignupConfigId() &&
      process.env[ENV_KEYS.WHATSAPP_APP_SECRET]?.trim(),
  );
}

export {
  getDefaultGeminiModel,
  getMissingEnvKeys,
  hasCompleteEnv,
  validateEnv,
} from "@/lib/env.schema";

export type {
  ClientEnv,
  EnvValidationIssue,
  EnvValidationResult,
  ServerEnv,
} from "@/lib/env.schema";
