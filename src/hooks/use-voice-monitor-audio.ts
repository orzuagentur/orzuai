"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { decodeMulawToFloat32 } from "@/utils/voice-mulaw-decode";

const SAMPLE_RATE = 8000;
const PLAYBACK_LEAD_SECONDS = 0.05;

export type VoiceMonitorAudioStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "error"
  | "unavailable";

type UseVoiceMonitorAudioOptions = {
  callLogId: string | null;
  enabled: boolean;
};

type MonitorTokenResponse = {
  success?: boolean;
  message?: string;
  monitorWsUrl?: string;
  token?: string;
};

export function useVoiceMonitorAudio({
  callLogId,
  enabled,
}: UseVoiceMonitorAudioOptions) {
  const [status, setStatus] = useState<VoiceMonitorAudioStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const stop = useCallback(() => {
    intentionalCloseRef.current = true;

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    socketRef.current?.close();
    socketRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    nextPlayTimeRef.current = 0;
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const scheduleAudio = useCallback((samples: Float32Array) => {
    if (samples.length === 0) {
      return;
    }

    const pcm = new Float32Array(samples);

    let context = audioContextRef.current;
    if (!context || context.state === "closed") {
      context = new AudioContext();
      audioContextRef.current = context;
      nextPlayTimeRef.current = context.currentTime + PLAYBACK_LEAD_SECONDS;
    }

    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }

    const buffer = context.createBuffer(1, pcm.length, SAMPLE_RATE);
    buffer.copyToChannel(pcm, 0);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    const startAt = Math.max(context.currentTime, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;

    const lag = nextPlayTimeRef.current - context.currentTime;
    if (lag > 0.75) {
      nextPlayTimeRef.current = context.currentTime + PLAYBACK_LEAD_SECONDS;
    }
  }, []);

  const handleBinaryFrame = useCallback(
    (data: ArrayBuffer) => {
      const bytes = new Uint8Array(data);
      if (bytes.byteLength < 2) {
        return;
      }

      const audio = bytes.subarray(1);
      scheduleAudio(decodeMulawToFloat32(audio));
    },
    [scheduleAudio],
  );

  const connect = useCallback(async () => {
    if (!callLogId) {
      return;
    }

    stop();
    intentionalCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    setStatus("connecting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/voice/monitor/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callLogId }),
      });

      const payload = (await response.json()) as MonitorTokenResponse;

      if (!response.ok || !payload.success || !payload.monitorWsUrl || !payload.token) {
        throw new Error(payload.message ?? "Unable to start live audio monitor.");
      }

      const wsUrl = new URL(payload.monitorWsUrl);
      wsUrl.searchParams.set("token", payload.token);

      const socket = new WebSocket(wsUrl.toString());
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus("listening");
      };

      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          handleBinaryFrame(event.data);
          return;
        }

        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data) as { type?: string };
            if (message.type === "ready") {
              setStatus("listening");
            }
          } catch {
            // Ignore malformed control messages.
          }
        }
      };

      socket.onerror = () => {
        setStatus("error");
        setErrorMessage("Live audio connection failed.");
      };

      socket.onclose = (event) => {
        socketRef.current = null;

        if (event.code === 4429) {
          setStatus("error");
          setErrorMessage("Monitor listener limit reached for this call.");
          return;
        }

        if (event.code === 4401) {
          setStatus("error");
          setErrorMessage("Live audio authorization expired.");
          return;
        }

        if (intentionalCloseRef.current) {
          setStatus("idle");
          return;
        }

        if (
          enabled &&
          callLogId &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS &&
          event.code !== 4401 &&
          event.code !== 4429
        ) {
          reconnectAttemptsRef.current += 1;
          const delayMs = Math.min(2000 * reconnectAttemptsRef.current, 10_000);
          reconnectTimerRef.current = window.setTimeout(() => {
            void connect();
          }, delayMs);
          return;
        }

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatus("error");
          setErrorMessage(
            "Live audio monitor is unavailable. Redeploy voice-stream or try again later.",
          );
        }
      };
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start live audio monitor.",
      );
    }
  }, [callLogId, enabled, handleBinaryFrame, stop]);

  useEffect(() => {
    if (!enabled || !callLogId) {
      stop();
      return;
    }

    intentionalCloseRef.current = false;
    void connect();

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect only when call/session changes
  }, [callLogId, enabled]);

  return {
    status,
    errorMessage,
    isListening: status === "listening",
    reconnect: connect,
    stop,
  };
}
