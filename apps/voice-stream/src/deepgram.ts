import WebSocket from "ws";

export type DeepgramLiveSession = {
  sendAudio: (payloadBase64: string) => void;
  close: () => void;
};

const DEEPGRAM_LISTEN_CONFIG = {
  model: "nova-3",
  endpointing: process.env.DEEPGRAM_ENDPOINTING_MS?.trim() || "400",
  utteranceEndMs: "1000",
} as const;

/** Twilio μ-law 8 kHz: 160 bytes ≈ 20 ms per frame. */
const AUDIO_FRAME_BYTES = 160;
const AUDIO_FRAME_INTERVAL_MS = 20;
const MAX_PENDING_AUDIO_BYTES = 8000 * 5;

function resolveDeepgramListenLanguage(language: string): string {
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
    return "multi";
  }

  return "multi";
}

function buildDeepgramListenUrl(language: string): string {
  const listenLanguage = resolveDeepgramListenLanguage(language);
  const url = new URL("wss://api.deepgram.com/v1/listen");
  url.searchParams.set("model", DEEPGRAM_LISTEN_CONFIG.model);
  url.searchParams.set("language", listenLanguage);
  url.searchParams.set("encoding", "mulaw");
  url.searchParams.set("sample_rate", "8000");
  url.searchParams.set("channels", "1");
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("endpointing", DEEPGRAM_LISTEN_CONFIG.endpointing);
  url.searchParams.set("utterance_end_ms", DEEPGRAM_LISTEN_CONFIG.utteranceEndMs);
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
  onFinalTranscript: (text: string, options?: { speechFinal?: boolean }) => void;
  onUtteranceEnd?: () => void;
  onSpeechStarted: () => void;
  onError?: (message: string) => void;
}): DeepgramLiveSession {
  const apiKey = input.apiKey.trim();
  const listenLanguage = resolveDeepgramListenLanguage(input.language);
  const listenUrl = buildDeepgramListenUrl(input.language);

  let socket: WebSocket | null = new WebSocket(listenUrl, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  let isClosed = false;
  const pendingAudio: Buffer[] = [];
  let pendingAudioBytes = 0;
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let flushTimer: NodeJS.Timeout | null = null;

  const trimPendingAudio = () => {
    while (
      pendingAudioBytes > MAX_PENDING_AUDIO_BYTES &&
      pendingAudio.length > 0
    ) {
      const removed = pendingAudio.shift();
      if (removed) {
        pendingAudioBytes -= removed.byteLength;
      }
    }
  };

  const flushPendingAudio = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || pendingAudio.length === 0) {
      return;
    }

    if (flushTimer) {
      return;
    }

    const sendNextFrame = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        flushTimer = null;
        return;
      }

      if (pendingAudio.length === 0) {
        flushTimer = null;
        return;
      }

      const head = pendingAudio[0];
      if (!head || head.byteLength === 0) {
        pendingAudio.shift();
        flushTimer = setTimeout(sendNextFrame, AUDIO_FRAME_INTERVAL_MS);
        return;
      }

      const frame = head.subarray(
        0,
        Math.min(AUDIO_FRAME_BYTES, head.byteLength),
      );
      socket.send(frame);

      if (head.byteLength <= AUDIO_FRAME_BYTES) {
        pendingAudio.shift();
        pendingAudioBytes -= head.byteLength;
      } else {
        pendingAudio[0] = head.subarray(AUDIO_FRAME_BYTES);
        pendingAudioBytes -= AUDIO_FRAME_BYTES;
      }

      flushTimer = setTimeout(sendNextFrame, AUDIO_FRAME_INTERVAL_MS);
    };

    sendNextFrame();
  };

  const clearKeepAlive = () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  };

  const clearFlushTimer = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
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
        model: DEEPGRAM_LISTEN_CONFIG.model,
        language: listenLanguage,
        endpointing: DEEPGRAM_LISTEN_CONFIG.endpointing,
        utteranceEndMs: DEEPGRAM_LISTEN_CONFIG.utteranceEndMs,
        detail: detail ?? null,
      }),
    );
    input.onError?.(message);
  };

  const attachSocketHandlers = (ws: WebSocket) => {
    ws.on("open", () => {
      console.info(
        "[voice-stream] deepgram connected",
        JSON.stringify({
          model: DEEPGRAM_LISTEN_CONFIG.model,
          language: listenLanguage,
          endpointing: DEEPGRAM_LISTEN_CONFIG.endpointing,
          utteranceEndMs: DEEPGRAM_LISTEN_CONFIG.utteranceEndMs,
        }),
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

        if (payload.type === "UtteranceEnd") {
          input.onUtteranceEnd?.();
          return;
        }

        if (payload.type !== "Results") {
          return;
        }

        const transcript = payload.channel?.alternatives?.[0]?.transcript?.trim();
        if (!transcript) {
          return;
        }

        if (payload.speech_final) {
          input.onFinalTranscript(transcript, { speechFinal: true });
          return;
        }

        if (payload.is_final) {
          input.onFinalTranscript(transcript, { speechFinal: false });
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
      clearFlushTimer();

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
        pendingAudioBytes += chunk.byteLength;
        trimPendingAudio();
        return;
      }

      socket.send(chunk);
    },
    close() {
      isClosed = true;
      clearKeepAlive();
      clearFlushTimer();
      pendingAudio.length = 0;
      pendingAudioBytes = 0;

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
