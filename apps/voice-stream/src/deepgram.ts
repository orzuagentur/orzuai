import {
  createClient,
  LiveTranscriptionEvents,
  type ListenLiveClient,
} from "@deepgram/sdk";

export type DeepgramLiveSession = {
  connection: ListenLiveClient;
  sendAudio: (payloadBase64: string) => void;
  close: () => void;
};

function resolveDeepgramModelLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();

  if (
    normalized === "multi" ||
    normalized.startsWith("en") ||
    normalized === "english" ||
    !normalized
  ) {
    return "multi";
  }

  return language;
}

export function startDeepgramLive(input: {
  apiKey: string;
  language: string;
  onFinalTranscript: (text: string) => void;
  onSpeechStarted: () => void;
  onError?: (message: string) => void;
}): DeepgramLiveSession {
  const client = createClient(input.apiKey);
  const connection = client.listen.live({
    model: "nova-2",
    encoding: "mulaw",
    sample_rate: 8000,
    language: resolveDeepgramModelLanguage(input.language),
    interim_results: true,
    utterance_end_ms: 900,
    endpointing: 250,
    smart_format: true,
    vad_events: true,
  });

  let isOpen = false;
  const pendingAudio: ArrayBuffer[] = [];

  const flushPendingAudio = () => {
    for (const chunk of pendingAudio) {
      connection.send(chunk);
    }

    pendingAudio.length = 0;
  };

  connection.on(LiveTranscriptionEvents.Open, () => {
    isOpen = true;
    console.info("[voice-stream] deepgram connected");
    flushPendingAudio();
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    input.onSpeechStarted();
  });

  connection.on(LiveTranscriptionEvents.Transcript, (payload) => {
    const transcript = payload.channel?.alternatives?.[0]?.transcript?.trim();
    if (!transcript) {
      return;
    }

    if (payload.is_final || payload.speech_final) {
      input.onFinalTranscript(transcript);
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (error) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "deepgram stream error";

    console.error("[voice-stream] deepgram error", message, error);
    input.onError?.(message);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    isOpen = false;
  });

  return {
    connection,
    sendAudio(payloadBase64: string) {
      const buffer = Buffer.from(payloadBase64, "base64");
      const chunk = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );

      if (!isOpen) {
        pendingAudio.push(chunk);
        return;
      }

      connection.send(chunk);
    },
    close: () => {
      pendingAudio.length = 0;
      connection.requestClose();
    },
  };
}
