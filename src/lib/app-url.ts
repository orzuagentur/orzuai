import { APP_ORIGIN } from "@/constants/app-origin";
import { ENV_KEYS } from "@/constants/env-keys";

/** App origin from env, falling back to production `orzux.com`. */
export function getConfiguredAppOrigin(): string {
  const fromEnv = process.env[ENV_KEYS.NEXT_PUBLIC_APP_URL]?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  return APP_ORIGIN;
}

export function buildAppUrl(path: string): string {
  const base = getConfiguredAppOrigin();

  if (!base) {
    return "";
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
