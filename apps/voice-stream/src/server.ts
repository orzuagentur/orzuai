import http from "http";
import { WebSocketServer } from "ws";

import { getEnv, requireEnv } from "./config.js";
import { VoiceStreamSession } from "./session.js";

const port = Number.parseInt(
  getEnv("PORT") ?? getEnv("VOICE_STREAM_PORT") ?? "8081",
  10,
);
const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
const streamSecret = requireEnv("VOICE_STREAM_SECRET");
const elevenLabsApiKey = requireEnv("ELEVENLABS_API_KEY");
const deepgramApiKey = requireEnv("DEEPGRAM_API_KEY");

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  response.writeHead(404);
  response.end();
});

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

server.listen(port, () => {
  console.info(
    `[voice-stream] listening on :${port} path=/voice/stream app=${appUrl}`,
  );
});
