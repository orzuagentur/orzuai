import { createServer } from "node:http";

import { getSecret } from "@orzu/secrets/server";
import { createClient } from "@supabase/supabase-js";
import { Api, TelegramClient } from "telegram";
import { NewMessage, type NewMessageEvent } from "telegram/events";
import { LogLevel } from "telegram/extensions/Logger";
import { StringSession } from "telegram/sessions";

import { loadConfig } from "./config";

const config = loadConfig();

const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// getSecret is typed against the app's Database generic; the worker uses an
// untyped client, so bridge the parameter type here.
type SecretClient = Parameters<typeof getSecret>[0];

type ConnectionRow = {
  business_id: string;
  status: string;
  session_secret_key_name: string | null;
};

type ActiveClient = {
  client: TelegramClient;
  sessionKeyName: string;
};

type InboundMessage = {
  chatId: string;
  externalMessageId: string;
  senderName: string | null;
  text: string;
  sentAt: string;
};

const active = new Map<string, ActiveClient>();
let stopping = false;

function log(...args: unknown[]): void {
  console.log("[telegram-userbot]", ...args);
}

async function postInbound(
  businessId: string,
  message: InboundMessage,
): Promise<void> {
  try {
    const response = await fetch(config.ingestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-userbot-secret": config.ingestSecret,
      },
      body: JSON.stringify({ businessId, messages: [message] }),
    });

    if (!response.ok) {
      log("ingest rejected", businessId, response.status);
    }
  } catch (error) {
    log(
      "ingest error",
      businessId,
      error instanceof Error ? error.message : error,
    );
  }
}

function buildHandler(businessId: string) {
  return async (event: NewMessageEvent): Promise<void> => {
    try {
      // Only mirror one-to-one direct messages into the CRM inbox.
      if (!event.isPrivate) {
        return;
      }

      const message = event.message;

      if (!message || message.out || !message.message) {
        return;
      }

      const chatId = message.chatId
        ? String(message.chatId)
        : message.senderId
          ? String(message.senderId)
          : "";

      if (!chatId) {
        return;
      }

      let senderName: string | null = null;

      try {
        const sender = await message.getSender();
        if (sender instanceof Api.User) {
          senderName = sender.firstName ?? sender.username ?? null;
        }
      } catch {
        // sender resolution is best-effort
      }

      await postInbound(businessId, {
        chatId,
        externalMessageId: String(message.id),
        senderName,
        text: message.message,
        sentAt: new Date(message.date * 1000).toISOString(),
      });
    } catch (error) {
      log(
        "handler error",
        businessId,
        error instanceof Error ? error.message : error,
      );
    }
  };
}

async function startClient(row: ConnectionRow): Promise<void> {
  if (!row.session_secret_key_name || active.has(row.business_id)) {
    return;
  }

  const session = await getSecret(
    supabase as unknown as SecretClient,
    row.session_secret_key_name,
  );

  if (!session) {
    log("no session stored for", row.business_id);
    return;
  }

  const client = new TelegramClient(
    new StringSession(session.trim()),
    config.apiId,
    config.apiHash,
    { connectionRetries: 5, autoReconnect: true },
  );

  client.setLogLevel(LogLevel.ERROR);
  await client.connect();

  const authorized = await client.checkAuthorization();

  if (!authorized) {
    log("session not authorized for", row.business_id);
    await client.disconnect();
    await client.destroy();
    return;
  }

  client.addEventHandler(
    buildHandler(row.business_id),
    new NewMessage({ incoming: true }),
  );

  active.set(row.business_id, {
    client,
    sessionKeyName: row.session_secret_key_name,
  });

  log("connected", row.business_id);
}

async function stopClient(businessId: string): Promise<void> {
  const entry = active.get(businessId);

  if (!entry) {
    return;
  }

  active.delete(businessId);

  try {
    await entry.client.disconnect();
    await entry.client.destroy();
  } catch {
    // best-effort teardown
  }

  log("disconnected", businessId);
}

async function reconcile(): Promise<void> {
  const { data, error } = await supabase
    .from("telegram_user_connections")
    .select("business_id, status, session_secret_key_name")
    .eq("status", "connected");

  if (error) {
    log("reconcile query error", error.message);
    return;
  }

  const rows = (data ?? []) as ConnectionRow[];
  const wanted = new Set(rows.map((row) => row.business_id));

  for (const businessId of [...active.keys()]) {
    if (!wanted.has(businessId)) {
      await stopClient(businessId);
    }
  }

  for (const row of rows) {
    if (active.has(row.business_id)) {
      continue;
    }

    try {
      await startClient(row);
    } catch (error) {
      log(
        "start failed",
        row.business_id,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

function startHttpServer(): void {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

    if (request.method === "GET" && (pathname === "/health" || pathname === "/")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          service: "telegram-userbot",
          sessions: active.size,
        }),
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(config.port, () => {
    log("http server listening on", config.port);
  });
}

async function main(): Promise<void> {
  log("starting worker; api_id", config.apiId);
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
    await Promise.all([...active.keys()].map((id) => stopClient(id)));
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main().catch((error) => {
  log("fatal", error instanceof Error ? error.message : error);
  process.exit(1);
});
