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
  type proto,
  type WAMessage,
  type WAMessageKey,
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
  updated_at?: string | null;
};

type ActiveSocket = {
  sock: WASocket;
  credsKeyName: string | null;
  serialize: () => string;
  saveTimer: NodeJS.Timeout | null;
  reconnectTimer: NodeJS.Timeout | null;
  starting: boolean;
  open: boolean;
  /** True once this socket (or a prior one for the business) reached open. */
  everConnected: boolean;
  /** phone digits / raw recipient → inbound chat JID (often @lid), for debugging. */
  chatJidByRecipient: Map<string, string>;
  /** inbound chat JID → phone digits, so outbound can use PN addressing. */
  phoneByChatJid: Map<string, string>;
  /** Recent outbound/inbound messages for Baileys retry/decrypt (getMessage). */
  recentMessages: Map<string, proto.IMessage>;
  processedInboundIds: Set<string>;
};

const active = new Map<string, ActiveSocket>();
/** Survives socket restarts so LID routing / decrypt cache is not lost. */
const sessionMemory = new Map<
  string,
  {
    everConnected: boolean;
    failedPairingAttempts: number;
    chatJidByRecipient: Map<string, string>;
    phoneByChatJid: Map<string, string>;
    recentMessages: Map<string, proto.IMessage>;
    processedInboundIds: Set<string>;
  }
>();
let stopping = false;
const reconnectTimers = new Map<string, NodeJS.Timeout>();

const RECENT_INBOUND_MAX_AGE_MS = 15 * 60 * 1000;
const RECENT_MESSAGE_CACHE_LIMIT = 200;
const PROCESSED_ID_LIMIT = 500;
const MAX_FAILED_PAIRING_ATTEMPTS = 3;

function memoryFor(businessId: string) {
  const existing = sessionMemory.get(businessId);
  if (existing) {
    return existing;
  }

  const created = {
    everConnected: false,
    failedPairingAttempts: 0,
    chatJidByRecipient: new Map<string, string>(),
    phoneByChatJid: new Map<string, string>(),
    recentMessages: new Map<string, proto.IMessage>(),
    processedInboundIds: new Set<string>(),
  };
  sessionMemory.set(businessId, created);
  return created;
}

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

function messageCacheKey(key: WAMessageKey): string | null {
  const jid = key.remoteJid;
  const id = key.id;
  if (!jid || !id) {
    return null;
  }
  return `${jid}|${id}|${key.fromMe ? "1" : "0"}`;
}

function rememberMessage(entry: ActiveSocket, message: WAMessage): void {
  const cacheKey = messageCacheKey(message.key);
  if (!cacheKey || !message.message) {
    return;
  }

  entry.recentMessages.set(cacheKey, message.message);
  if (entry.recentMessages.size > RECENT_MESSAGE_CACHE_LIMIT) {
    const first = entry.recentMessages.keys().next().value;
    if (first) {
      entry.recentMessages.delete(first);
    }
  }
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

function rememberChatJid(
  entry: ActiveSocket,
  from: string,
  remoteJid: string,
): void {
  const normalized = jidNormalizedUser(remoteJid) || remoteJid;
  entry.chatJidByRecipient.set(from, normalized);

  const phone = phoneDigitsFromAddress(from);
  if (phone) {
    entry.chatJidByRecipient.set(phone, normalized);
    entry.chatJidByRecipient.set(`+${phone}`, normalized);
    entry.phoneByChatJid.set(normalized, phone);
  }
}

/** Resolve outbound replies to the phone-number JID whenever possible. */
async function resolveOutboundJid(
  entry: ActiveSocket,
  recipient: string,
): Promise<string> {
  const trimmed = recipient.trim();

  if (isLidUser(trimmed)) {
    const normalized = jidNormalizedUser(trimmed) || trimmed;
    const phone = entry.phoneByChatJid.get(normalized);
    if (phone) {
      return `${phone}@s.whatsapp.net`;
    }

    return jidNormalizedUser(trimmed) || trimmed;
  }

  const digits = digitsOnly(trimmed);
  if (digits) {
    return `${digits}@s.whatsapp.net`;
  }

  if (trimmed.includes("@")) {
    return toJid(trimmed);
  }

  return toJid(trimmed);
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
    chatJid: string;
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
      const body = await response.text().catch(() => "");
      log("ingest rejected", businessId, response.status, body.slice(0, 200));
    } else {
      log("ingest ok", businessId, message.externalMessageId);
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

function isRecentInbound(message: WAMessage): boolean {
  const timestamp = Number(message.messageTimestamp ?? 0);
  if (!timestamp) {
    return true;
  }

  const ageMs = Date.now() - timestamp * 1000;
  return ageMs <= RECENT_INBOUND_MAX_AGE_MS;
}

async function handleInboundMessage(
  businessId: string,
  entry: ActiveSocket,
  message: WAMessage,
): Promise<void> {
  if (message.key.fromMe) {
    rememberMessage(entry, message);
    return;
  }

  const remoteJid = message.key.remoteJid ?? "";
  if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
    return;
  }

  if (!isRecentInbound(message)) {
    return;
  }

  rememberMessage(entry, message);

  const externalMessageId =
    message.key.id ?? `${remoteJid}:${Number(message.messageTimestamp ?? 0)}`;

  if (entry.processedInboundIds.has(externalMessageId)) {
    return;
  }

  const from = resolveInboundFrom(message);
  if (!from) {
    log("skip inbound without resolvable sender", businessId, remoteJid);
    return;
  }

  const text = extractText(
    message.message as Record<string, unknown> | null,
  ).trim();
  if (!text) {
    // Ciphertext often arrives empty until retry/decrypt fills it in later.
    return;
  }

  entry.processedInboundIds.add(externalMessageId);
  if (entry.processedInboundIds.size > PROCESSED_ID_LIMIT) {
    const first = entry.processedInboundIds.values().next().value;
    if (first) {
      entry.processedInboundIds.delete(first);
    }
  }

  rememberChatJid(entry, from, remoteJid);

  const timestamp = Number(message.messageTimestamp ?? 0);

  await forwardInbound(businessId, {
    from,
    chatJid: jidNormalizedUser(remoteJid) || remoteJid,
    externalMessageId,
    senderName: message.pushName ?? null,
    text,
    sentAt: timestamp
      ? new Date(timestamp * 1000).toISOString()
      : new Date().toISOString(),
  });
}

function scheduleReconnect(businessId: string, delayMs = 2_000): void {
  if (stopping) {
    return;
  }

  const existingTimer = reconnectTimers.get(businessId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    reconnectTimers.delete(businessId);

    void (async () => {
      const { data } = await supabase
        .from("whatsapp_web_connections")
        .select("business_id, status, creds_secret_key_name")
        .eq("business_id", businessId)
        .maybeSingle();

      if (!data || !["pending_qr", "connected"].includes(data.status)) {
        return;
      }

      if (active.get(businessId)?.open || active.get(businessId)?.starting) {
        return;
      }

      try {
        await startSocket(data as ConnectionRow);
      } catch (error) {
        log("reconnect failed", businessId, describe(error));
      }
    })();
  }, delayMs);

  reconnectTimers.set(businessId, timer);
}

async function startSocket(row: ConnectionRow): Promise<void> {
  const businessId = row.business_id;
  const existing = active.get(businessId);
  if (existing?.starting || existing?.open) {
    return;
  }

  if (existing) {
    await stopSocket(businessId, { reconnect: false });
  }

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
    markOnlineOnConnect: false,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
    getMessage: async (key) => {
      const entry = active.get(businessId);
      if (!entry) {
        return undefined;
      }
      const cacheKey = messageCacheKey(key);
      return cacheKey ? entry.recentMessages.get(cacheKey) : undefined;
    },
  });

  const memory = memoryFor(businessId);
  if (row.status === "connected") {
    memory.everConnected = true;
  }
  // Fresh "Connect" from the UI clears the creds key — reset pairing budget.
  if (!row.creds_secret_key_name) {
    memory.failedPairingAttempts = 0;
  }

  const entry: ActiveSocket = {
    sock,
    credsKeyName: row.creds_secret_key_name,
    serialize: bundle.serialize,
    saveTimer: null,
    reconnectTimer: null,
    starting: true,
    open: false,
    everConnected: memory.everConnected,
    chatJidByRecipient: memory.chatJidByRecipient,
    phoneByChatJid: memory.phoneByChatJid,
    recentMessages: memory.recentMessages,
    processedInboundIds: memory.processedInboundIds,
  };
  active.set(businessId, entry);

  // Persist ephemeral QR-session creds immediately so reconnects reuse them.
  void persistCreds(businessId);

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
        entry.open = true;
        entry.everConnected = true;
        const memory = memoryFor(businessId);
        memory.everConnected = true;
        memory.failedPairingAttempts = 0;
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
        const restartRequired =
          statusCode === DisconnectReason.restartRequired;
        const memory = memoryFor(businessId);

        entry.open = false;
        entry.starting = false;
        active.delete(businessId);

        try {
          sock.end(undefined);
        } catch {
          // ignore
        }

        if (loggedOut) {
          memory.failedPairingAttempts = 0;
          await updateRow(businessId, {
            status: "disconnected",
            qr_code: null,
            qr_expires_at: null,
            creds_secret_key_name: null,
          });
          log("logged out", businessId);
          return;
        }

        if (!memory.everConnected && !entry.everConnected) {
          memory.failedPairingAttempts += 1;

          if (memory.failedPairingAttempts >= MAX_FAILED_PAIRING_ATTEMPTS) {
            await updateRow(businessId, {
              status: "disconnected",
              qr_code: null,
              qr_expires_at: null,
            });
            log(
              "pairing abandoned after failed attempts",
              businessId,
              memory.failedPairingAttempts,
            );
            return;
          }
        }

        // QR pairing sockets flap often — back off harder than connected ones
        // so abandoned pending_qr rows do not hammer WhatsApp every few seconds.
        const delayMs = restartRequired
          ? 1_000
          : memory.everConnected || entry.everConnected
            ? 2_500
            : 45_000;

        log("connection closed, reconnecting", businessId, statusCode, `in ${delayMs}ms`);
        scheduleReconnect(businessId, delayMs);
      }
    })();
  });

  sock.ev.on("messages.upsert", (event) => {
    void (async () => {
      // `notify` = live; `append` often carries the first decrypted message
      // after a session/prekey exchange — do not ignore recent appends.
      if (event.type !== "notify" && event.type !== "append") {
        return;
      }

      for (const message of event.messages) {
        await handleInboundMessage(businessId, entry, message);
      }
    })();
  });

  sock.ev.on("messages.update", (updates) => {
    void (async () => {
      for (const item of updates) {
        if (!item.update.message) {
          continue;
        }

        const hydrated: WAMessage = {
          key: item.key,
          message: item.update.message,
          messageTimestamp: item.update.messageTimestamp,
          pushName: item.update.pushName,
        } as WAMessage;

        await handleInboundMessage(businessId, entry, hydrated);
      }
    })();
  });

  log("socket started", businessId);
}

async function stopSocket(
  businessId: string,
  options: { reconnect?: boolean } = {},
): Promise<void> {
  const entry = active.get(businessId);
  if (!entry) {
    return;
  }
  active.delete(businessId);
  if (entry.saveTimer) {
    clearTimeout(entry.saveTimer);
  }
  const pendingReconnect = reconnectTimers.get(businessId);
  if (pendingReconnect && !options.reconnect) {
    clearTimeout(pendingReconnect);
    reconnectTimers.delete(businessId);
  }
  try {
    entry.sock.end(undefined);
  } catch {
    // ignore
  }
  log("socket stopped", businessId);

  if (options.reconnect) {
    scheduleReconnect(businessId, 1_500);
  }
}

async function reconcile(): Promise<void> {
  const { data, error } = await supabase
    .from("whatsapp_web_connections")
    .select("business_id, status, creds_secret_key_name, updated_at")
    .in("status", ["pending_qr", "connected"]);

  if (error) {
    log("reconcile query error", error.message);
    return;
  }

  const rows = (data ?? []) as ConnectionRow[];
  const wanted = new Set<string>();

  for (const row of rows) {
    // Stale QR pairing attempts (no successful connect) should not keep
    // reconnecting forever — they fight keepalive for real sessions.
    if (row.status === "pending_qr") {
      const updatedAtMs = row.updated_at
        ? Date.parse(row.updated_at)
        : Number.NaN;
      const stale =
        !Number.isFinite(updatedAtMs) ||
        Date.now() - updatedAtMs > 3 * 60 * 1000;

      if (stale && !memoryFor(row.business_id).everConnected) {
        await updateRow(row.business_id, {
          status: "disconnected",
          qr_code: null,
          qr_expires_at: null,
        });
        await stopSocket(row.business_id);
        log("stale pending_qr cleared", row.business_id);
        continue;
      }
    }

    wanted.add(row.business_id);
  }

  for (const businessId of [...active.keys()]) {
    if (!wanted.has(businessId)) {
      await stopSocket(businessId);
    }
  }

  for (const row of rows) {
    if (!wanted.has(row.business_id)) {
      continue;
    }

    const entry = active.get(row.business_id);
    const memory = memoryFor(row.business_id);

    if (
      row.status === "pending_qr" &&
      memory.failedPairingAttempts >= MAX_FAILED_PAIRING_ATTEMPTS
    ) {
      await updateRow(row.business_id, {
        status: "disconnected",
        qr_code: null,
        qr_expires_at: null,
      });
      await stopSocket(row.business_id);
      log("pending_qr force-disconnected", row.business_id);
      continue;
    }

    // A reconnect is already scheduled — don't fight it with reconcile.
    if (reconnectTimers.has(row.business_id)) {
      continue;
    }

    if (entry?.open || entry?.starting) {
      // Refresh creds key name if the DB row caught up after first persist.
      if (
        entry.credsKeyName !== row.creds_secret_key_name &&
        row.creds_secret_key_name
      ) {
        entry.credsKeyName = row.creds_secret_key_name;
      }
      continue;
    }

    // Restart when a fresh pairing was requested (creds key name cleared).
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
  if (!entry?.open) {
    return {
      status: 409,
      payload: { success: false, error: "WhatsApp Web is not connected." },
    };
  }

  const jid = await resolveOutboundJid(entry, to);
  log("send", businessId, "to", to, "jid", jid);

  try {
    try {
      await entry.sock.assertSessions([jid], false);
    } catch (error) {
      log("assertSessions warning", businessId, jid, describe(error));
    }

    try {
      await entry.sock.presenceSubscribe(jid);
    } catch {
      // optional; ignore
    }

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

    if (sent) {
      rememberMessage(entry, sent as WAMessage);
    }

    return {
      status: 200,
      payload: { success: true, providerMessageId: sent?.key?.id ?? null, jid },
    };
  } catch (error) {
    log("send failed", businessId, jid, describe(error));
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
        const sockets = [...active.entries()].map(([businessId, entry]) => ({
          businessId,
          open: entry.open,
          starting: entry.starting,
        }));
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            ok: true,
            sockets: active.size,
            open: sockets.filter((item) => item.open).length,
            details: sockets,
          }),
        );
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
