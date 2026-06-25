import {
  isMigratableAppSecretKey,
  MIGRATABLE_APP_SECRET_KEYS,
} from "./migratable-keys";

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
  // Windows / shell / IDE noise — never migrate
  "VSCODE_",
  "GIT_",
  "EFC_",
  "CHROME_",
  "CURSOR_",
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
  "USERNAME",
  "USERDOMAIN",
  "USERDOMAIN_ROAMINGPROFILE",
  "TEMP",
  "TMP",
  "TMPDIR",
  "PWD",
  "OS",
  "PROCESSOR_ARCHITECTURE",
  "PROCESSOR_IDENTIFIER",
  "PROCESSOR_LEVEL",
  "PROCESSOR_REVISION",
  "NUMBER_OF_PROCESSORS",
  "INIT_CWD",
  "PORT",
  "HOST",
  "HOSTNAME",
  "NODE",
  "APPDATA",
  "LOCALAPPDATA",
  "ALLUSERSPROFILE",
  "HOMEDRIVE",
  "HOMEPATH",
  "PUBLIC",
  "COMPUTERNAME",
  "LOGONSERVER",
  "SESSIONNAME",
  "PATHEXT",
  "PROMPT",
  "COMSPEC",
  "WINDIR",
  "SYSTEMROOT",
  "SYSTEMDRIVE",
  "PROGRAMFILES",
  "PROGRAMDATA",
  "COMMONPROGRAMFILES",
  "COMMONPROGRAMFILES(X86)",
  "PROGRAMFILES(X86)",
  "PROGRAMW6432",
  "DRIVERDATA",
  "ONEDRIVE",
  "ONEDRIVECONSUMER",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TERM",
  "COLORTERM",
  "COLOR",
  "EDITOR",
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
  "VBOX_MSI_INSTALL_PATH",
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

export { isMigratableAppSecretKey, MIGRATABLE_APP_SECRET_KEYS };

export function collectMigratableEnvKeys(
  env: NodeJS.ProcessEnv = process.env,
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];

  for (const key of MIGRATABLE_APP_SECRET_KEYS) {
    const trimmed = env[key]?.trim();

    if (!trimmed) {
      continue;
    }

    entries.push({ key, value: trimmed });
  }

  return entries;
}
