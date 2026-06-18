import { ENV_KEYS } from "@/constants/env-keys";

/** 360dialog WhatsApp Cloud API — production (Messaging API). */
export const DIALOG360_PRODUCTION_API_BASE = "https://waba-v2.360dialog.io";

/** 360dialog WhatsApp sandbox — test API keys only. */
export const DIALOG360_SANDBOX_API_BASE = "https://waba-sandbox.360dialog.io";

export type Dialog360ApiMode = "production" | "sandbox" | "custom";

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeApiBase(url: string): string {
  return url.replace(/\/$/, "");
}

export function getDialog360ApiBase(): string {
  const customBase = process.env[ENV_KEYS.DIALOG360_API_BASE]?.trim();

  if (customBase) {
    return normalizeApiBase(customBase);
  }

  if (isTruthyEnv(process.env[ENV_KEYS.DIALOG360_USE_SANDBOX])) {
    return DIALOG360_SANDBOX_API_BASE;
  }

  return DIALOG360_PRODUCTION_API_BASE;
}

export function getDialog360ApiMode(): Dialog360ApiMode {
  const apiBase = getDialog360ApiBase();

  if (apiBase === DIALOG360_SANDBOX_API_BASE) {
    return "sandbox";
  }

  if (apiBase === DIALOG360_PRODUCTION_API_BASE) {
    return "production";
  }

  return "custom";
}

export function isDialog360SandboxMode(): boolean {
  return getDialog360ApiMode() === "sandbox";
}
