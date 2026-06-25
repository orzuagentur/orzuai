/** Keys that must stay in process.env (bootstrap / public / runtime). */
const BOOTSTRAP_PREFIXES = [
  "NEXT_PUBLIC_",
  "VERCEL_",
  "TURBO_",
  "NX_",
  "CI",
  "NODE_",
  "npm_",
  "NPM_",
  "__",
] as const;

const BOOTSTRAP_EXACT_KEYS = new Set([
  "ENCRYPTION_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "PATH",
  "HOME",
  "USER",
  "USERPROFILE",
  "TEMP",
  "TMP",
  "TMPDIR",
  "PWD",
  "OS",
  "PROCESSOR_ARCHITECTURE",
  "NUMBER_OF_PROCESSORS",
  "INIT_CWD",
  "PORT",
  "HOST",
  "HOSTNAME",
]);

export function isBootstrapEnvKey(keyName: string): boolean {
  const key = keyName.trim();

  if (!key) {
    return true;
  }

  if (BOOTSTRAP_EXACT_KEYS.has(key)) {
    return true;
  }

  return BOOTSTRAP_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function collectMigratableEnvKeys(
  env: NodeJS.ProcessEnv = process.env,
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(env)) {
    const trimmed = value?.trim();

    if (!trimmed || isBootstrapEnvKey(key)) {
      continue;
    }

    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      continue;
    }

    entries.push({ key, value: trimmed });
  }

  return entries.sort((left, right) => left.key.localeCompare(right.key));
}
