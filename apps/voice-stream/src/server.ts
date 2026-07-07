// Voice stream worker — paced TTS playback + early STT connect (v2).
import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import type { Duplex } from "stream";
import { WebSocketServer } from "ws";

import {
  getEnv,
  requireEnv,
  validateTwilioRequestSignature,
  verifyStreamToken,
} from "./config.js";
import { createVoiceMonitorWebSocketServer } from "./monitor-server.js";
import { voiceMonitorHub } from "./monitor-hub.js";
import { RuntimeAiKeyProvider } from "./runtime-keys.js";
import { VoiceStreamSession } from "./session.js";

const port = Number.parseInt(
  getEnv("PORT") ?? getEnv("VOICE_STREAM_PORT") ?? "8081",
  10,
);
const host = getEnv("HOST") ?? "0.0.0.0";
const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
const streamSecret = requireEnv("VOICE_STREAM_SECRET");
const twilioAuthToken = getEnv("TWILIO_AUTH_TOKEN");
const publicStreamUrl = getEnv("VOICE_STREAM_WS_URL");

const runtimeKeys = new RuntimeAiKeyProvider(appUrl, streamSecret);

function isHealthCheckRequest(request: IncomingMessage): boolean {
  const pathname = new URL(
    request.url ?? "/",
    "http://localhost",
  ).pathname;

  return pathname === "/health" || pathname === "/health/";
}

function handleHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  if (isHealthCheckRequest(request)) {
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ ok: true, service: "voice-stream" }));
    return;
  }

  response.writeHead(404);
  response.end();
}

const server = http.createServer(handleHttpRequest);

const streamWss = new WebSocketServer({ noServer: true });
const monitorWss = createVoiceMonitorWebSocketServer(streamSecret);

function rejectUpgrade(socket: Duplex): void {
  socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
  socket.destroy();
}

function getHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getTwilioSignatureUrlCandidates(request: IncomingMessage): string[] {
  const rawUrl = request.url ?? "/";
  const parsedRequestUrl = new URL(rawUrl, "http://localhost");
  const pathAndSearch = `${parsedRequestUrl.pathname}${parsedRequestUrl.search}`;
  const candidates = new Set<string>();
  const host = getHeaderValue(request.headers.host)?.trim();
  const forwardedHost =
    getHeaderValue(request.headers["x-forwarded-host"])?.split(",")[0]?.trim();
  const forwardedProto =
    getHeaderValue(request.headers["x-forwarded-proto"])?.split(",")[0]?.trim();

  for (const candidateHost of [forwardedHost, host]) {
    if (!candidateHost) {
      continue;
    }

    for (const scheme of [
      forwardedProto === "https" ? "https" : forwardedProto,
      "wss",
      "https",
    ].filter(Boolean)) {
      candidates.add(`${scheme}://${candidateHost}${pathAndSearch}`);
    }
  }

  if (publicStreamUrl) {
    const parsed = new URL(publicStreamUrl);
    parsed.search = parsedRequestUrl.search;
    candidates.add(parsed.toString());
  }

  return [...candidates];
}

async function fetchTwilioAuthContextForBusiness(
  businessId: string,
): Promise<{ authToken: string; expectedAccountSid: string | null } | null> {
  const url = new URL(`${appUrl}/api/internal/voice-stream/twilio-auth`);
  url.searchParams.set("businessId", businessId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${streamSecret}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    authToken?: string | null;
    expectedAccountSid?: string | null;
  } | null;
  const authToken = payload?.authToken?.trim();

  if (!authToken) {
    return null;
  }

  return {
    authToken,
    expectedAccountSid: payload?.expectedAccountSid?.trim() || null,
  };
}

async function resolveTwilioStreamAuthContext(
  request: IncomingMessage,
): Promise<{ authToken: string; expectedAccountSid: string | null } | null> {
  const params = new URL(request.url ?? "/", "http://localhost").searchParams;
  const businessId = params.get("businessId")?.trim();
  const callSid = params.get("callSid")?.trim();
  const streamToken = params.get("streamToken")?.trim();

  if (
    businessId &&
    callSid &&
    streamToken &&
    verifyStreamToken({
      businessId,
      callSid,
      secret: streamSecret,
      token: streamToken,
    })
  ) {
    const customerContext = await fetchTwilioAuthContextForBusiness(businessId);

    if (customerContext) {
      return customerContext;
    }
  }

  return twilioAuthToken
    ? { authToken: twilioAuthToken, expectedAccountSid: null }
    : null;
}

async function isTwilioStreamUpgradeValid(request: IncomingMessage): Promise<boolean> {
  const signature = getHeaderValue(request.headers["x-twilio-signature"]);
  const params = Object.fromEntries(
    new URL(request.url ?? "/", "http://localhost").searchParams.entries(),
  );
  const authContext = await resolveTwilioStreamAuthContext(request);

  if (!authContext) {
    return false;
  }

  if (
    authContext.expectedAccountSid &&
    params.AccountSid &&
    params.AccountSid !== authContext.expectedAccountSid
  ) {
    return false;
  }

  return getTwilioSignatureUrlCandidates(request).some((url) =>
    validateTwilioRequestSignature({
      authToken: authContext.authToken,
      signature,
      url,
      params,
    }),
  );
}

async function handleUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<void> {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (pathname === "/voice/stream") {
    if (!(await isTwilioStreamUpgradeValid(request))) {
      rejectUpgrade(socket);
      return;
    }

    streamWss.handleUpgrade(request, socket, head, (ws) => {
      streamWss.emit("connection", ws, request);
    });
    return;
  }

  if (pathname === "/voice/monitor") {
    monitorWss.handleUpgrade(request, socket, head, (ws) => {
      monitorWss.emit("connection", ws, request);
    });
    return;
  }

  socket.destroy();
}

server.on("upgrade", (request, socket, head) => {
  void handleUpgrade(request, socket, head).catch((error) => {
    console.error(
      "[voice-stream] upgrade validation failed",
      error instanceof Error ? error.message : "unknown",
    );
    rejectUpgrade(socket);
  });
});

streamWss.on("connection", (ws) => {
  const session = new VoiceStreamSession({
    ws,
    appUrl,
    streamSecret,
    getElevenLabsApiKey: () => runtimeKeys.elevenLabsApiKey,
    getDeepgramApiKey: () => runtimeKeys.deepgramApiKey,
    getOpenAiApiKey: () => runtimeKeys.openaiApiKey,
  });

  ws.on("message", (data) => {
    void session.handleMessage(data.toString()).catch((error) => {
      console.error(
        "[voice-stream] message handler failed",
        error instanceof Error ? error.message : "unknown",
      );
    });
  });

  ws.on("close", () => {
    session.close();
  });

  ws.on("error", (error) => {
    console.error("[voice-stream] websocket error", error);
    session.close();
  });
});

let isShuttingDown = false;

function shutdown(signal: string): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.info(`[voice-stream] received ${signal}, shutting down`);

  runtimeKeys.stop();
  voiceMonitorHub.closeAll();

  monitorWss.clients.forEach((client) => {
    client.close();
  });

  streamWss.clients.forEach((client) => {
    client.close();
  });

  server.close((error) => {
    if (error) {
      console.error(
        "[voice-stream] shutdown failed",
        error instanceof Error ? error.message : "unknown",
      );
      process.exit(1);
      return;
    }

    console.info("[voice-stream] shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("[voice-stream] forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

void runtimeKeys.start().then(() => {
  server.listen(port, host, () => {
    console.info(
      `[voice-stream] listening on ${host}:${port} paths=/voice/stream,/voice/monitor app=${appUrl} (platform-ai keys via runtime refresh)`,
    );
  });
}).catch((error) => {
  console.error(
    "[voice-stream] failed to initialize runtime keys",
    error instanceof Error ? error.message : "unknown",
  );
  process.exit(1);
});

server.on("error", (error) => {
  console.error(
    "[voice-stream] server failed to start",
    error instanceof Error ? error.message : "unknown",
  );
  process.exit(1);
});
