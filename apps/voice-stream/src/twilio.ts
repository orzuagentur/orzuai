import type WebSocket from "ws";

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
): void {
  ws.send(
    JSON.stringify({
      event: "media",
      streamSid,
      media: { payload: payloadBase64 },
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
}): Promise<void> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}/stream?output_format=ulaw_8000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": input.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/x-mulaw",
      },
      body: JSON.stringify({
        text: input.text,
        model_id: "eleven_turbo_v2_5",
        language_code: input.languageCode || undefined,
      }),
      signal: input.abortSignal,
    },
  );

  if (!response.ok || !response.body) {
    throw new Error(`ElevenLabs stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const chunkSize = 640;

  while (!input.abortSignal.aborted) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }

    for (let offset = 0; offset < value.byteLength; offset += chunkSize) {
      if (input.abortSignal.aborted) {
        break;
      }

      const slice = value.subarray(
        offset,
        Math.min(offset + chunkSize, value.byteLength),
      );
      sendTwilioMedia(
        input.ws,
        input.streamSid,
        Buffer.from(slice).toString("base64"),
      );
    }
  }
}
