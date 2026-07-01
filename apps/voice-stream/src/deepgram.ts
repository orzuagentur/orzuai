import WebSocket from "ws";

export type DeepgramLiveSession = {
  sendAudio: (payloadBase64: string) => void;
  close: () => void;
};

type DeepgramListenConfig = {
  model: string;
  language: string;
};

function resolveDeepgramLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (normalized.startsWith("uk") || normalized.includes("ukrain")) {
    return "uk";
  }

  if (normalized.startsWith("ru") || normalized.includes("russ")) {
    return "ru";
  }

  if (normalized.startsWith("de") || normalized.includes("german")) {
    return "de";
  }

  if (normalized.startsWith("es") || normalized.includes("spanish")) {
    return "es";
  }

  if (
    normalized.startsWith("en") ||
    normalized === "english" ||
    normalized === "multi" ||
    !normalized
  ) {
    return "en";
  }

  return language.trim();
}

function resolveDeepgramListenConfig(language: string): DeepgramListenConfig {
  const resolvedLanguage = resolveDeepgramLanguage(language);

  // nova-2-phonecall is English-only. Other languages need nova-2 general.
  return {
    model: resolvedLanguage === "en" ? "nova-2-phonecall" : "nova-2",
    language: resolvedLanguage,
  };
}

function buildDeepgramListenUrl(config: DeepgramListenConfig): string {
  const url = new URL("wss://api.deepgram.com/v1/listen");
  url.searchParams.set("model", config.model);
  url.searchParams.set("encoding", "mulaw");
  url.searchParams.set("sample_rate", "8000");
  url.searchParams.set("channels", "1");
  url.searchParams.set("language", config.language);
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("utterance_end_ms", "1000");
  url.searchParams.set("endpointing", "300");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("vad_events", "true");
  return url.toString();
}

type DeepgramTranscriptMessage = {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{ transcript?: string }>;
  };
};

export function startDeepgramLive(input: {
  apiKey: string;
  language: string;
  onFinalTranscript: (text: string) => void;
  onSpeechStarted: () => void;
  onError?: (message: string) => void;
}): DeepgramLiveSession {
  const apiKey = input.apiKey.trim();
  const listenConfig = resolveDeepgramListenConfig(input.language);
  const listenUrl = buildDeepgramListenUrl(listenConfig);

  let socket: WebSocket | null = new WebSocket(listenUrl, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  let isClosed = false;
  const pendingAudio: Buffer[] = [];
  let keepAliveTimer: NodeJS.Timeout | null = null;

  const flushPendingAudio = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const chunk of pendingAudio) {
      socket.send(chunk);
    }

    pendingAudio.length = 0;
  };

  const clearKeepAlive = () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  };

  const reportError = (message: string, detail?: unknown) => {
    if (isClosed) {
      return;
    }

    console.error(
      "[voice-stream] deepgram error",
      message,
      JSON.stringify({
        model: listenConfig.model,
        language: listenConfig.language,
        detail: detail ?? null,
      }),
    );
    input.onError?.(message);
  };

  const attachSocketHandlers = (ws: WebSocket) => {
    ws.on("open", () => {
      console.info(
        "[voice-stream] deepgram connected",
        JSON.stringify(listenConfig),
      );
      flushPendingAudio();

      keepAliveTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, 8000);
    });

    ws.on("message", (data) => {
      try {
        const payload = JSON.parse(data.toString()) as DeepgramTranscriptMessage;

        if (payload.type === "SpeechStarted") {
          input.onSpeechStarted();
          return;
        }

        if (payload.type !== "Results") {
          return;
        }

        const transcript = payload.channel?.alternatives?.[0]?.transcript?.trim();
        if (!transcript) {
          return;
        }

        if (payload.is_final || payload.speech_final) {
          input.onFinalTranscript(transcript);
        }
      } catch (error) {
        reportError(
          "Failed to parse Deepgram transcript message",
          error instanceof Error ? error.message : error,
        );
      }
    });

    ws.on("unexpected-response", (_request, response) => {
      let body = "";

      response.on("data", (chunk) => {
        body += chunk.toString();
      });

      response.on("end", () => {
        const dgError = response.headers["dg-error"];
        reportError(
          `Deepgram handshake failed (${response.statusCode} ${response.statusMessage})`,
          dgError || body.trim() || undefined,
        );
      });
    });

    ws.on("error", (error) => {
      reportError(
        error instanceof Error ? error.message : "Deepgram websocket error",
        error,
      );
    });

    ws.on("close", (code, reason) => {
      clearKeepAlive();

      if (!isClosed && code !== 1000) {
        reportError(
          `Deepgram connection closed (${code})`,
          reason.toString() || undefined,
        );
      }
    });
  };

  attachSocketHandlers(socket);

  return {
    sendAudio(payloadBase64: string) {
      const chunk = Buffer.from(payloadBase64, "base64");

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        pendingAudio.push(chunk);
        return;
      }

      socket.send(chunk);
    },
    close() {
      isClosed = true;
      clearKeepAlive();
      pendingAudio.length = 0;

      if (!socket) {
        return;
      }

      const ws = socket;
      socket = null;

      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "CloseStream" }));
        } catch {
          // Ignore close race while stream is shutting down.
        }
        ws.close();
        return;
      }

      if (ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      }
    },
  };
}
