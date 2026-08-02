import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { Boom } from "@hapi/boom";
import { getSecret, setSecret } from "@orzu/secrets/server";
import { createClient } from "@supabase/supabase-js";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  isLidUser,
  jidDecode,
  jidNormalizedUser,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";

import { makeAuthState, parseStoredAuth } from "./auth-state";
import { loadConfig } from "./config";

const config = loadConfig();

const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type SecretClient = Parameters<typeof getSecret>[0];
const secretClient = supabase as unknown as SecretClient;

const logger = pino({ level: "silent" });

type ConnectionRow = {
  business_id: string;
  status: string;
  creds_secret_key_name: string | null;
};

type ActiveSocket = {
  sock: WASocket;
  credsKeyName: string | null;
  serialize: () => string;
  saveTimer: NodeJS.Timeout | null;
  starting: boolean;
};

const active = new Map<string, ActiveSocket>();
let stopping = false;

function log(...args: unknown[]): void {
  console.log("[whatsapp-web]", ...args);
}

function credsKeyNameFor(businessId: string): string {
  const normalized = businessId.replace(/-/g, "_").toUpperCase();
  return `INTEGRATION_SECRET_${normalized}_WHATSAPP_WEB_CREDS`;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Extract real phone digits from a PN JID / raw phone. Returns null for LIDs —
 * Linked IDs look numeric but are not phone numbers.
 */
function phoneDigitsFromAddress(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    if (isLidUser(trimmed)) {
      return null;
    }

    const decoded = jidDecode(trimmed);
    if (!decoded?.user) {
      return null;
    }

    if (decoded.server !== "s.whatsapp.net" && decoded.server !== "c.us") {
      return null;
    }

    const digits = digitsOnly(decoded.user);
    return digits || null;
  }

  const digits = digitsOnly(trimmed);
  return digits || null;
}

function resolveInboundFrom(message: WAMessage): string | null {
  const phone =
    phoneDigitsFromAddress(message.key.senderPn) ||
    phoneDigitsFromAddress(message.key.participantPn) ||
    phoneDigitsFromAddress(message.key.remoteJid);

  if (phone) {
    return phone;
  }

  const remoteJid = message.key.remoteJid ?? "";
  if (remoteJid && isLidUser(remoteJid)) {
    // Keep the LID JID so replies can still be routed; never treat LID as a phone.
    return jidNormalizedUser(remoteJid);
  }

  return null;
}

function connectedAccountPhone(sock: WASocket): string | null {
  const me = sock.user;
  return (
    phoneDigitsFromAddress(me?.jid) ||
    phoneDigitsFromAddress(me?.id) ||
    null
  );
}

function toJid(recipient: string): string {
  const trimmed = recipient.trim();
  if (trimmed.includes("@")) {
    return jidNormalizedUser(trimmed) || trimmed;
  }
  return `${digitsOnly(trimmed)}@s.whatsapp.net`;
}

async function updateRow(
  businessId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from("whatsapp_web_connections")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
}

async function persistCreds(businessId: string): Promise<void> {
  const entry = active.get(businessId);
  if (!entry) {
    return;
  }

  const keyName = entry.credsKeyName ?? credsKeyNameFor(businessId);

  try {
    await setSecret(secretClient, {
      keyName,
      value: entry.serialize(),
      description: `Encrypted WhatsApp Web (Baileys) auth for business ${businessId}`,
    });

    if (entry.credsKeyName !== keyName) {
      entry.credsKeyName = keyName;
      await updateRow(businessId, { creds_secret_key_name: keyName });
    }
  } catch (error) {
    log("persist creds failed", businessId, describe(error));
  }
}

function schedulePersist(businessId: string): void {
  const entry = active.get(businessId);
  if (!entry) {
    return;
  }
  if (entry.saveTimer) {
    clearTimeout(entry.saveTimer);
  }
  entry.saveTimer = setTimeout(() => {
    entry.saveTimer = null;
    void persistCreds(businessId);
  }, 1_500);
}

async function forwardInbound(
  businessId: string,
  message: {
    from: string;
    externalMessageId: string;
    senderName: string | null;
    text: string;
    sentAt: string;
  },
): Promise<void> {
  try {
    const response = await fetch(config.ingestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-userbot-secret": config.sharedSecret,
      },
      body: JSON.stringify({ businessId, messages: [message] }),
    });
    if (!response.ok) {
      log("ingest rejected", businessId, response.status);
    }
  } catch (error) {
    log("ingest error", businessId, describe(error));
  }
}

function extractText(message: Record<string, unknown> | null | undefined): string {
  if (!message) {
    return "";
  }
  const m = message as {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    documentMessage?: { caption?: string };
  };
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    ""
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "unknown");
}

async function startSocket(row: ConnectionRow): Promise<void> {
  const businessId = row.business_id;
  const existing = active.get(businessId);
  if (existing?.starting) {
    return;
  }

  // Load stored creds unless a fresh pairing was requested (key name cleared).
  let stored = null;
  if (row.creds_secret_key_name) {
    try {
      const raw = await getSecret(secretClient, row.creds_secret_key_name);
      stored = parseStoredAuth(raw);
    } catch (error) {
      log("load creds failed", businessId, describe(error));
    }
  }

  const bundle = makeAuthState(stored, () => schedulePersist(businessId));

  const sock = makeWASocket({
    auth: bundle.state,
    logger,
    printQRInTerminal: false,
    browser: Browsers.appropriate("Chrome"),
    syncFullHistory: false,
  });

  const entry: ActiveSocket = {
    sock,
    credsKeyName: row.creds_secret_key_name,
    serialize: bundle.serialize,
    saveTimer: null,
    starting: true,
  };
  active.set(businessId, entry);

  sock.ev.on("creds.update", () => {
    void persistCreds(businessId);
  });

  sock.ev.on("connection.update", (update) => {
    void (async () => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
          await updateRow(businessId, {
            status: "pending_qr",
            qr_code: dataUrl,
            qr_expires_at: new Date(Date.now() + 60_000).toISOString(),
          });
        } catch (error) {
          log("qr encode failed", businessId, describe(error));
        }
      }

      if (connection === "open") {
        entry.starting = false;
        const phone = connectedAccountPhone(sock);
        await updateRow(businessId, {
          status: "connected",
          qr_code: null,
          qr_expires_at: null,
          phone_number: phone ? `+${phone}` : null,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        });
        await persistCreds(businessId);
        log("connected", businessId, phone ? `+${phone}` : "unknown-phone");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
          ?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        active.delete(businessId);
        try {
          sock.end(undefined);
        } catch {
          // ignore
        }

        if (loggedOut) {
          await updateRow(businessId, {
            status: "disconnected",
            qr_code: null,
            qr_expires_at: null,
            creds_secret_key_name: null,
          });
          log("logged out", businessId);
          return;
        }

        log("connection closed, will retry on next reconcile", businessId, statusCode);
      }
    })();
  });

  sock.ev.on("messages.upsert", (event) => {
    void (async () => {
      if (event.type !== "notify") {
        return;
      }

      for (const message of event.messages) {
        if (message.key.fromMe) {
          continue;
        }

        const remoteJid = message.key.remoteJid ?? "";
        if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
          continue;
        }

        const from = resolveInboundFrom(message);
        if (!from) {
          log("skip inbound without resolvable sender", businessId, remoteJid);
          continue;
        }

        const text = extractText(
          message.message as Record<string, unknown> | null,
        ).trim();
        if (!text) {
          continue;
        }

        const timestamp = Number(message.messageTimestamp ?? 0);

        await forwardInbound(businessId, {
          from,
          externalMessageId: message.key.id ?? `${remoteJid}:${timestamp}`,
          senderName: message.pushName ?? null,
          text,
          sentAt: timestamp
            ? new Date(timestamp * 1000).toISOString()
            : new Date().toISOString(),
        });
      }
    })();
  });

  entry.starting = false;
  log("socket started", businessId);
}

async function stopSocket(businessId: string): Promise<void> {
  const entry = active.get(businessId);
  if (!entry) {
    return;
  }
  active.delete(businessId);
  if (entry.saveTimer) {
    clearTimeout(entry.saveTimer);
  }
  try {
    entry.sock.end(undefined);
  } catch {
    // ignore
  }
  log("socket stopped", businessId);
}

async function reconcile(): Promise<void> {
  const { data, error } = await supabase
    .from("whatsapp_web_connections")
    .select("business_id, status, creds_secret_key_name")
    .in("status", ["pending_qr", "connected"]);

  if (error) {
    log("reconcile query error", error.message);
    return;
  }

  const rows = (data ?? []) as ConnectionRow[];
  const wanted = new Set(rows.map((row) => row.business_id));

  for (const businessId of [...active.keys()]) {
    if (!wanted.has(businessId)) {
      await stopSocket(businessId);
    }
  }

  for (const row of rows) {
    const entry = active.get(row.business_id);

    // Restart when a fresh pairing was requested (creds key name changed/cleared).
    if (entry && entry.credsKeyName !== row.creds_secret_key_name) {
      await stopSocket(row.business_id);
    }

    if (!active.has(row.business_id)) {
      try {
        await startSocket(row);
      } catch (err) {
        log("start failed", row.business_id, describe(err));
      }
    }
  }
}

async function handleSend(
  body: {
    businessId?: string;
    to?: string;
    text?: string;
    media?: { url?: string; mimeType?: string; fileName?: string; kind?: string } | null;
  },
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const { businessId, to, text, media } = body;

  if (!businessId || !to) {
    return { status: 400, payload: { success: false, error: "Missing businessId or to." } };
  }

  const entry = active.get(businessId);
  if (!entry) {
    return { status: 409, payload: { success: false, error: "WhatsApp Web is not connected." } };
  }

  const jid = toJid(to);

  try {
    let sent;
    if (media?.url) {
      const kind = media.kind ?? "document";
      const caption = text?.trim() || undefined;
      if (kind === "image") {
        sent = await entry.sock.sendMessage(jid, { image: { url: media.url }, caption });
      } else if (kind === "video") {
        sent = await entry.sock.sendMessage(jid, { video: { url: media.url }, caption });
      } else if (kind === "audio") {
        sent = await entry.sock.sendMessage(jid, {
          audio: { url: media.url },
          mimetype: media.mimeType || "audio/ogg; codecs=opus",
        });
      } else {
        sent = await entry.sock.sendMessage(jid, {
          document: { url: media.url },
          mimetype: media.mimeType || "application/octet-stream",
          fileName: media.fileName || "file",
          caption,
        });
      }
    } else {
      sent = await entry.sock.sendMessage(jid, { text: text ?? "" });
    }

    return {
      status: 200,
      payload: { success: true, providerMessageId: sent?.key?.id ?? null },
    };
  } catch (error) {
    return { status: 502, payload: { success: false, error: describe(error) } };
  }
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(chunk as Buffer));
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function startHttpServer(): void {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, sockets: active.size }));
        return;
      }

      if (request.method === "POST" && request.url === "/send") {
        const provided = request.headers["x-userbot-secret"];
        if (provided !== config.sharedSecret) {
          response.writeHead(401, { "content-type": "application/json" });
          response.end(JSON.stringify({ success: false, error: "Unauthorized" }));
          return;
        }

        try {
          const body = (await readJsonBody(request)) as Parameters<typeof handleSend>[0];
          const result = await handleSend(body);
          response.writeHead(result.status, { "content-type": "application/json" });
          response.end(JSON.stringify(result.payload));
        } catch {
          response.writeHead(400, { "content-type": "application/json" });
          response.end(JSON.stringify({ success: false, error: "Invalid payload" }));
        }
        return;
      }

      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
    })();
  });

  server.listen(config.port, () => {
    log("http server listening on", config.port);
  });
}

async function main(): Promise<void> {
  log("starting worker");
  startHttpServer();
  await reconcile();

  const timer = setInterval(() => {
    if (!stopping) {
      void reconcile();
    }
  }, config.refreshIntervalMs);

  const shutdown = async (): Promise<void> => {
    if (stopping) {
      return;
    }
    stopping = true;
    clearInterval(timer);
    log("shutting down");
    await Promise.all([...active.keys()].map((id) => stopSocket(id)));
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main().catch((error) => {
  log("fatal", describe(error));
  process.exit(1);
});
