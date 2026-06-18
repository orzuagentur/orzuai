import { SUPPORT_EMAIL } from "@/constants/app-origin";
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

export function hasClientSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    hasClientSupabaseEnv() &&
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

export function hasOpenAiEnv(): boolean {
  return Boolean(process.env[ENV_KEYS.OPENAI_API_KEY]?.trim());
}

export function hasClaudeEnv(): boolean {
  return Boolean(process.env[ENV_KEYS.ANTHROPIC_API_KEY]?.trim());
}

export function hasTwilioEnv(): boolean {
  return Boolean(
    process.env[ENV_KEYS.TWILIO_ACCOUNT_SID]?.trim() &&
      process.env[ENV_KEYS.TWILIO_AUTH_TOKEN]?.trim(),
  );
}

export function hasRetellEnv(): boolean {
  return Boolean(process.env[ENV_KEYS.RETELL_API_KEY]?.trim());
}

export function hasVapiEnv(): boolean {
  return Boolean(process.env[ENV_KEYS.VAPI_API_KEY]?.trim());
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

export function getVapidPublicKey(): string | undefined {
  return process.env[ENV_KEYS.NEXT_PUBLIC_VAPID_PUBLIC_KEY]?.trim() || undefined;
}

export function getVapidPrivateKey(): string | undefined {
  return process.env[ENV_KEYS.VAPID_PRIVATE_KEY]?.trim() || undefined;
}

export function getVapidSubject(): string {
  return (
    process.env[ENV_KEYS.VAPID_SUBJECT]?.trim() || `mailto:${SUPPORT_EMAIL}`
  );
}

export function hasPushEnv(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey());
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
