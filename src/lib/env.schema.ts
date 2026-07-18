import { z } from "zod";

import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini/constants";
import {
  ENV_KEYS,
  OPTIONAL_SERVER_ENV_KEYS,
  REQUIRED_CLIENT_ENV_KEYS,
  REQUIRED_SERVER_ENV_KEYS,
} from "@/constants/env-keys";

const resendFromEmailSchema = z
  .string()
  .trim()
  .min(3, "RESEND_FROM_EMAIL is required")
  .refine((value) => {
    const match = value.match(/<([^>]+)>/);
    const email = match?.[1] ?? value;

    return z.string().email().safeParse(email).success;
  }, "RESEND_FROM_EMAIL must be a valid email or 'Name <email@domain.com>' format");

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

const optionalEnvString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

function optionalEnvStringMin(min: number) {
  return z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(min).optional(),
  );
}

export const clientEnvSchema = z.object({
  [ENV_KEYS.NEXT_PUBLIC_APP_URL]: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  [ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL]: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  [ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  [ENV_KEYS.NEXT_PUBLIC_META_APP_ID]: optionalEnvString,
  [ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID]: optionalEnvString,
  [ENV_KEYS.NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID]: optionalEnvString,
});

export const serverEnvSchema = z.object({
  [ENV_KEYS.SUPABASE_SERVICE_ROLE_KEY]: z
    .string()
    .trim()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  [ENV_KEYS.RESEND_API_KEY]: z
    .string()
    .trim()
    .min(1, "RESEND_API_KEY is required")
    .startsWith("re_", "RESEND_API_KEY must start with 're_'"),
  [ENV_KEYS.RESEND_FROM_EMAIL]: resendFromEmailSchema,
  [ENV_KEYS.GEMINI_API_KEY]: z
    .string()
    .trim()
    .min(1, "GEMINI_API_KEY is required"),
  [ENV_KEYS.GEMINI_DEFAULT_MODEL]: optionalEnvString,
  [ENV_KEYS.GOOGLE_CLIENT_ID]: optionalEnvString,
  [ENV_KEYS.GOOGLE_CLIENT_SECRET]: optionalEnvString,
  [ENV_KEYS.WHATSAPP_VERIFY_TOKEN]: optionalEnvString,
  [ENV_KEYS.WHATSAPP_APP_SECRET]: optionalEnvString,
  [ENV_KEYS.WHATSAPP_API_VERSION]: optionalEnvString,
  [ENV_KEYS.NEXT_PUBLIC_META_APP_ID]: optionalEnvString,
  [ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID]: optionalEnvString,
  [ENV_KEYS.NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID]: optionalEnvString,
  [ENV_KEYS.INSTAGRAM_VERIFY_TOKEN]: optionalEnvString,
  [ENV_KEYS.TELEGRAM_WEBHOOK_SECRET]: optionalEnvString,
  [ENV_KEYS.CRON_SECRET]: optionalEnvStringMin(16),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type EnvValidationIssue = {
  key: string;
  message: string;
};

export type EnvValidationResult =
  | { success: true; client: ClientEnv; server: ServerEnv }
  | { success: false; issues: EnvValidationIssue[] };

function collectClientEnv(): Record<string, string | undefined> {
  return {
    [ENV_KEYS.NEXT_PUBLIC_APP_URL]: process.env[ENV_KEYS.NEXT_PUBLIC_APP_URL],
    [ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL]:
      process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_URL],
    [ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY]:
      process.env[ENV_KEYS.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    [ENV_KEYS.NEXT_PUBLIC_META_APP_ID]:
      process.env[ENV_KEYS.NEXT_PUBLIC_META_APP_ID],
    [ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID]:
      process.env[ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID],
    [ENV_KEYS.NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID]:
      process.env[ENV_KEYS.NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID],
  };
}

function collectServerEnv(): Record<string, string | undefined> {
  return {
    [ENV_KEYS.SUPABASE_SERVICE_ROLE_KEY]:
      process.env[ENV_KEYS.SUPABASE_SERVICE_ROLE_KEY],
    [ENV_KEYS.RESEND_API_KEY]: process.env[ENV_KEYS.RESEND_API_KEY],
    [ENV_KEYS.RESEND_FROM_EMAIL]: process.env[ENV_KEYS.RESEND_FROM_EMAIL],
    [ENV_KEYS.GEMINI_API_KEY]: process.env[ENV_KEYS.GEMINI_API_KEY],
    [ENV_KEYS.GEMINI_DEFAULT_MODEL]:
      process.env[ENV_KEYS.GEMINI_DEFAULT_MODEL],
    [ENV_KEYS.GOOGLE_CLIENT_ID]: process.env[ENV_KEYS.GOOGLE_CLIENT_ID],
    [ENV_KEYS.GOOGLE_CLIENT_SECRET]:
      process.env[ENV_KEYS.GOOGLE_CLIENT_SECRET],
    [ENV_KEYS.WHATSAPP_VERIFY_TOKEN]:
      process.env[ENV_KEYS.WHATSAPP_VERIFY_TOKEN],
    [ENV_KEYS.WHATSAPP_APP_SECRET]: process.env[ENV_KEYS.WHATSAPP_APP_SECRET],
    [ENV_KEYS.WHATSAPP_API_VERSION]:
      process.env[ENV_KEYS.WHATSAPP_API_VERSION],
    [ENV_KEYS.NEXT_PUBLIC_META_APP_ID]:
      process.env[ENV_KEYS.NEXT_PUBLIC_META_APP_ID],
    [ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID]:
      process.env[ENV_KEYS.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID],
    [ENV_KEYS.NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID]:
      process.env[ENV_KEYS.NEXT_PUBLIC_INSTAGRAM_EMBEDDED_SIGNUP_CONFIG_ID],
    [ENV_KEYS.INSTAGRAM_VERIFY_TOKEN]:
      process.env[ENV_KEYS.INSTAGRAM_VERIFY_TOKEN],
    [ENV_KEYS.TELEGRAM_WEBHOOK_SECRET]:
      process.env[ENV_KEYS.TELEGRAM_WEBHOOK_SECRET],
    [ENV_KEYS.CRON_SECRET]: process.env[ENV_KEYS.CRON_SECRET],
  };
}

function formatZodIssues(
  issues: z.ZodIssue[],
): EnvValidationIssue[] {
  return issues.map((issue) => ({
    key: issue.path.join("."),
    message: issue.message,
  }));
}

function readTrimmedProcessEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function collectConfiguredVoiceKeyIssues(keys: readonly string[]): EnvValidationIssue[] {
  return keys
    .filter((key) => key in process.env && !readTrimmedProcessEnv(key))
    .map((key) => ({
      key,
      message: `${key} is set but empty. Remove it or provide a real value.`,
    }));
}

function collectRequiredSetIssues(input: {
  name: string;
  triggerKeys: readonly string[];
  requiredKeys: readonly string[];
}): EnvValidationIssue[] {
  const hasAnyTrigger = input.triggerKeys.some((key) =>
    Boolean(readTrimmedProcessEnv(key)),
  );

  if (!hasAnyTrigger) {
    return [];
  }

  return input.requiredKeys
    .filter((key) => !readTrimmedProcessEnv(key))
    .map((key) => ({
      key,
      message: `${key} is required for ${input.name}.`,
    }));
}

function collectVoiceReadinessIssues(): EnvValidationIssue[] {
  const voiceKeys = [
    ENV_KEYS.TWILIO_ACCOUNT_SID,
    ENV_KEYS.TWILIO_AUTH_TOKEN,
    ENV_KEYS.TWILIO_CONNECT_APP_SID,
    ENV_KEYS.TWILIO_API_KEY_SID,
    ENV_KEYS.TWILIO_API_KEY_SECRET,
    ENV_KEYS.TWILIO_TWIML_APP_SID,
    ENV_KEYS.TWILIO_BROWSER_CALLER_ID,
    ENV_KEYS.TWILIO_WEBHOOK_SIGNING_SECRET,
    ENV_KEYS.TWILIO_WEBHOOK_SIGNING_SECRET_PREVIOUS,
    ENV_KEYS.VOICE_STREAM_WS_URL,
    ENV_KEYS.VOICE_STREAM_SECRET,
    ENV_KEYS.ELEVENLABS_API_KEY,
    ENV_KEYS.DEEPGRAM_API_KEY,
  ] as const;

  return [
    ...collectConfiguredVoiceKeyIssues(voiceKeys),
    ...collectRequiredSetIssues({
      name: "Twilio Connect webhooks",
      triggerKeys: [ENV_KEYS.TWILIO_CONNECT_APP_SID],
      requiredKeys: [
        ENV_KEYS.TWILIO_CONNECT_APP_SID,
        ENV_KEYS.TWILIO_ACCOUNT_SID,
        ENV_KEYS.TWILIO_AUTH_TOKEN,
      ],
    }),
    ...collectRequiredSetIssues({
      name: "platform Browser Phone",
      triggerKeys: [
        ENV_KEYS.TWILIO_API_KEY_SID,
        ENV_KEYS.TWILIO_API_KEY_SECRET,
        ENV_KEYS.TWILIO_TWIML_APP_SID,
      ],
      requiredKeys: [
        ENV_KEYS.TWILIO_ACCOUNT_SID,
        ENV_KEYS.TWILIO_AUTH_TOKEN,
        ENV_KEYS.TWILIO_API_KEY_SID,
        ENV_KEYS.TWILIO_API_KEY_SECRET,
        ENV_KEYS.TWILIO_TWIML_APP_SID,
      ],
    }),
    ...collectRequiredSetIssues({
      name: "realtime AI voice stream",
      triggerKeys: [
        ENV_KEYS.VOICE_STREAM_WS_URL,
        ENV_KEYS.VOICE_STREAM_SECRET,
        ENV_KEYS.ELEVENLABS_API_KEY,
        ENV_KEYS.DEEPGRAM_API_KEY,
      ],
      requiredKeys: [
        ENV_KEYS.VOICE_STREAM_WS_URL,
        ENV_KEYS.VOICE_STREAM_SECRET,
        ENV_KEYS.ELEVENLABS_API_KEY,
        ENV_KEYS.DEEPGRAM_API_KEY,
      ],
    }),
  ];
}

export function validateEnv(): EnvValidationResult {
  const clientResult = clientEnvSchema.safeParse(collectClientEnv());
  const serverResult = serverEnvSchema.safeParse(collectServerEnv());
  const issues: EnvValidationIssue[] = [];

  if (!clientResult.success) {
    issues.push(...formatZodIssues(clientResult.error.issues));
  }

  if (!serverResult.success) {
    issues.push(...formatZodIssues(serverResult.error.issues));
  }

  issues.push(...collectVoiceReadinessIssues());

  if (!clientResult.success || !serverResult.success || issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    client: clientResult.data,
    server: serverResult.data,
  };
}

export function getMissingEnvKeys(): string[] {
  const missing: string[] = [];

  for (const key of REQUIRED_CLIENT_ENV_KEYS) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  for (const key of REQUIRED_SERVER_ENV_KEYS) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  return missing;
}

export function hasCompleteEnv(): boolean {
  return validateEnv().success;
}

export function getDefaultGeminiModel(): string {
  return process.env[ENV_KEYS.GEMINI_DEFAULT_MODEL]?.trim() || DEFAULT_GEMINI_MODEL;
}

export {
  OPTIONAL_SERVER_ENV_KEYS,
  REQUIRED_CLIENT_ENV_KEYS,
  REQUIRED_SERVER_ENV_KEYS,
};
