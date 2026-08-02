/**
 * Environment configuration for the personal-Telegram (MTProto) worker.
 *
 * The worker connects one persistent GramJS client per connected business,
 * listens for new incoming direct messages, and forwards them to the main app's
 * secured internal ingest endpoint.
 */

export type WorkerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  encryptionKey: string;
  apiId: number;
  apiHash: string;
  ingestUrl: string;
  ingestSecret: string;
  port: number;
  refreshIntervalMs: number;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): WorkerConfig {
  const rawApiId = required("TELEGRAM_API_ID");
  const apiId = Number.parseInt(rawApiId, 10);

  if (!Number.isFinite(apiId) || apiId <= 0) {
    throw new Error("TELEGRAM_API_ID must be a positive integer.");
  }

  const rawInterval = process.env.TELEGRAM_USERBOT_REFRESH_MS?.trim();
  const refreshIntervalMs = rawInterval ? Number.parseInt(rawInterval, 10) : 30_000;
  const rawPort = process.env.PORT?.trim();
  const port = rawPort ? Number.parseInt(rawPort, 10) : 8080;

  return {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    encryptionKey: required("ENCRYPTION_KEY"),
    apiId,
    apiHash: required("TELEGRAM_API_HASH"),
    ingestUrl: required("TELEGRAM_USERBOT_INGEST_URL"),
    ingestSecret: required("TELEGRAM_USERBOT_SECRET"),
    port: Number.isFinite(port) && port > 0 ? port : 8080,
    refreshIntervalMs:
      Number.isFinite(refreshIntervalMs) && refreshIntervalMs >= 5_000
        ? refreshIntervalMs
        : 30_000,
  };
}
