import type { IncomingMessage } from "http";
import type { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";

import { verifyMonitorToken } from "./config.js";
import { voiceMonitorHub } from "./monitor-hub.js";

export function attachVoiceMonitorWebSocket(input: {
  server: HttpServer;
  streamSecret: string;
}): WebSocketServer {
  const monitorWss = new WebSocketServer({
    server: input.server,
    path: "/voice/monitor",
  });

  monitorWss.on("connection", (ws, request) => {
    const claims = parseMonitorClaims(request, input.streamSecret);

    if (!claims) {
      ws.close(4401, "unauthorized");
      return;
    }

    const subscribed = voiceMonitorHub.subscribe({
      ws,
      businessId: claims.businessId,
      callSid: claims.callSid,
    });

    if (!subscribed.ok) {
      ws.close(4429, subscribed.reason);
      return;
    }

    ws.send(
      JSON.stringify({
        type: "ready",
        callSid: claims.callSid,
        callLogId: claims.callLogId,
      }),
    );

    ws.on("error", (error) => {
      console.error(
        "[voice-stream] monitor websocket error",
        error instanceof Error ? error.message : "unknown",
      );
    });
  });

  return monitorWss;
}

function parseMonitorClaims(
  request: IncomingMessage,
  secret: string,
): ReturnType<typeof verifyMonitorToken> {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");
    return verifyMonitorToken(token, secret);
  } catch {
    return null;
  }
}
