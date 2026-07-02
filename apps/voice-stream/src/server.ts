// Voice stream worker — paced TTS playback + early STT connect (v2).
import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { WebSocketServer } from "ws";

import { getEnv, requireEnv } from "./config.js";
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

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (pathname === "/voice/stream") {
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
