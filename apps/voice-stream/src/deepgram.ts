import {
  createClient,
  LiveTranscriptionEvents,
  type ListenLiveClient,
} from "@deepgram/sdk";

export type DeepgramLiveSession = {
  connection: ListenLiveClient;
  close: () => void;
};

export function startDeepgramLive(input: {
  apiKey: string;
  language: string;
  onFinalTranscript: (text: string) => void;
  onSpeechStarted: () => void;
}): DeepgramLiveSession {
  const client = createClient(input.apiKey);
  const connection = client.listen.live({
    model: "nova-2",
    encoding: "mulaw",
    sample_rate: 8000,
    language: input.language,
    interim_results: true,
    utterance_end_ms: 900,
    endpointing: 250,
    smart_format: true,
    vad_events: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.info("[voice-stream] deepgram connected");
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
    console.error("[voice-stream] deepgram error", error);
  });

  return {
    connection,
    close: () => {
      connection.requestClose();
    },
  };
}

export function sendDeepgramAudio(
  connection: ListenLiveClient,
  payloadBase64: string,
): void {
  const buffer = Buffer.from(payloadBase64, "base64");
  connection.send(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}
