import { ENV_KEYS } from "@/constants/env-keys";
import { getDefaultGeminiModel } from "@/lib/env.schema";
import {
  META_APP_ID,
  WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID,
} from "@/lib/whatsapp/constants";

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

export function getMetaAppId(): string {
  return process.env[ENV_KEYS.NEXT_PUBLIC_META_APP_ID]?.trim() || META_APP_ID;
}

export function getWhatsAppEmbeddedSignupConfigId(): string {
  return (
    process.env[ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID]?.trim() ||
    WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID
  );
}

export function hasEmbeddedSignupEnv(): boolean {
  return Boolean(
    getMetaAppId() &&
      getWhatsAppEmbeddedSignupConfigId() &&
      process.env[ENV_KEYS.WHATSAPP_APP_SECRET]?.trim(),
  );
}

export function getInstagramEmbeddedSignupConfigId(): string | undefined {
  return (
    process.env[ENV_KEYS.NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID]?.trim() ||
    undefined
  );
}

export function getInstagramVerifyToken(): string | undefined {
  return process.env[ENV_KEYS.INSTAGRAM_VERIFY_TOKEN]?.trim() || undefined;
}

export function hasInstagramEnv(): boolean {
  return Boolean(
    getMetaAppId() &&
      getInstagramEmbeddedSignupConfigId() &&
      process.env[ENV_KEYS.WHATSAPP_APP_SECRET]?.trim(),
  );
}

export function getTelegramWebhookSecret(): string | undefined {
  return process.env[ENV_KEYS.TELEGRAM_WEBHOOK_SECRET]?.trim() || undefined;
}

export function hasTelegramEnv(): boolean {
  return Boolean(
    process.env[ENV_KEYS.NEXT_PUBLIC_APP_URL]?.trim()?.startsWith("https://"),
  );
}

/** @deprecated Per-bot webhook secrets are stored in telegram_connections. */
export function hasTelegramWebhookEnv(): boolean {
  return hasTelegramEnv();
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
