import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { WebSocketServer } from "ws";

import { getEnv, requireEnv } from "./config.js";
import { VoiceStreamSession } from "./session.js";

const port = Number.parseInt(
  getEnv("PORT") ?? getEnv("VOICE_STREAM_PORT") ?? "8081",
  10,
);
const host = getEnv("HOST") ?? "0.0.0.0";
const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
const streamSecret = requireEnv("VOICE_STREAM_SECRET");
const elevenLabsApiKey = requireEnv("ELEVENLABS_API_KEY");
const deepgramApiKey = requireEnv("DEEPGRAM_API_KEY");

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

const wss = new WebSocketServer({ server, path: "/voice/stream" });

wss.on("connection", (ws) => {
  const session = new VoiceStreamSession({
    ws,
    appUrl,
    streamSecret,
    elevenLabsApiKey,
    deepgramApiKey,
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

  wss.clients.forEach((client) => {
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

server.listen(port, host, () => {
  console.info(
    `[voice-stream] listening on ${host}:${port} path=/voice/stream app=${appUrl}`,
  );
});

server.on("error", (error) => {
  console.error(
    "[voice-stream] server failed to start",
    error instanceof Error ? error.message : "unknown",
  );
  process.exit(1);
});
