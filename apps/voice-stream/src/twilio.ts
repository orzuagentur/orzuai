import type WebSocket from "ws";

import { TwilioOutboundAudioPacer } from "./audio-pacer.js";

export type TwilioStreamStart = {
  event: "start";
  sequenceNumber: string;
  start: {
    streamSid: string;
    callSid: string;
    customParameters: Record<string, string>;
  };
};

export type TwilioStreamMedia = {
  event: "media";
  sequenceNumber: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
  streamSid: string;
};

export type TwilioStreamStop = {
  event: "stop";
  sequenceNumber: string;
  stop: {
    callSid: string;
  };
  streamSid: string;
};

export type TwilioStreamMessage =
  | TwilioStreamStart
  | TwilioStreamMedia
  | TwilioStreamStop
  | { event: string };

export function sendTwilioClear(ws: WebSocket, streamSid: string): void {
  ws.send(JSON.stringify({ event: "clear", streamSid }));
}

export function sendTwilioMedia(
  ws: WebSocket,
  streamSid: string,
  payloadBase64: string,
  timestampMs?: number,
): void {
  ws.send(
    JSON.stringify({
      event: "media",
      streamSid,
      media: {
        payload: payloadBase64,
        ...(timestampMs !== undefined
          ? { timestamp: String(timestampMs) }
          : {}),
      },
    }),
  );
}

export async function streamElevenLabsUlawToTwilio(input: {
  ws: WebSocket;
  streamSid: string;
  apiKey: string;
  voiceId: string;
  text: string;
  languageCode?: string;
  abortSignal: AbortSignal;
  pacer: TwilioOutboundAudioPacer;
}): Promise<void> {
  const streamUrl = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}/stream`,
  );
  streamUrl.searchParams.set("output_format", "ulaw_8000");
  streamUrl.searchParams.set("optimize_streaming_latency", "3");

  const response = await fetch(streamUrl.toString(), {
    method: "POST",
    headers: {
      "xi-api-key": input.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/x-mulaw",
    },
    body: JSON.stringify({
      text: input.text,
      model_id: "eleven_flash_v2_5",
      language_code: input.languageCode || undefined,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        style: 0.15,
        use_speaker_boost: true,
      },
      generation_config: {
        chunk_length_schedule: [120, 160, 250, 290],
      },
    }),
    signal: input.abortSignal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`ElevenLabs stream failed (${response.status})`);
  }

  const reader = response.body.getReader();

  while (!input.abortSignal.aborted) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }

    input.pacer.enqueue(value);
  }

  if (!input.abortSignal.aborted) {
    await input.pacer.drain();
  }
}
