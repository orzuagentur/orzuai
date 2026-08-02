/**
 * Environment configuration for the personal-WhatsApp (Web/QR, Baileys) worker.
 *
 * The worker holds one persistent Baileys socket per connected business,
 * relays QR codes and inbound messages to the main app, and exposes a small
 * HTTP surface (`/health`, `/send`) so the app can dispatch outbound messages.
 */

export type WorkerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  encryptionKey: string;
  ingestUrl: string;
  sharedSecret: string;
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
  const rawPort = process.env.PORT?.trim();
  const port = rawPort ? Number.parseInt(rawPort, 10) : 8080;

  const rawInterval = process.env.WHATSAPP_WEB_REFRESH_MS?.trim();
  const refreshIntervalMs = rawInterval ? Number.parseInt(rawInterval, 10) : 15_000;

  return {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    encryptionKey: required("ENCRYPTION_KEY"),
    ingestUrl: required("WHATSAPP_WEB_INGEST_URL"),
    sharedSecret: required("WHATSAPP_WEB_SECRET"),
    port: Number.isFinite(port) && port > 0 ? port : 8080,
    refreshIntervalMs:
      Number.isFinite(refreshIntervalMs) && refreshIntervalMs >= 5_000
        ? refreshIntervalMs
        : 15_000,
  };
}
