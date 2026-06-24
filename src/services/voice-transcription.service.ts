import "server-only";

import { hasOpenAiEnv } from "@/services/openai.service";

const WHISPER_MODEL = "whisper-1";

const MIME_EXTENSION: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/opus": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
};

function getOpenAiApiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function resolveTranscriptionFileName(fileName: string, mimeType: string): string {
  const trimmed = fileName.trim() || "voice";

  if (/\.[a-z0-9]{2,5}$/i.test(trimmed)) {
    return trimmed;
  }

  const normalizedMime = mimeType.toLowerCase().split(";")[0]!.trim();
  const extension = MIME_EXTENSION[normalizedMime] ?? "ogg";

  return `${trimmed}.${extension}`;
}

export async function transcribeAudioBuffer(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  language?: string;
}): Promise<string | null> {
  if (!hasOpenAiEnv()) {
    console.warn("[voice-transcription] OPENAI_API_KEY missing, skipping Whisper");
    return null;
  }

  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    return null;
  }

  const fileName = resolveTranscriptionFileName(input.fileName, input.mimeType);
  const mimeType = input.mimeType.trim() || "audio/ogg";

  const formData = new FormData();
  const uint8 = new Uint8Array(input.buffer);
  const blob = new Blob([uint8], { type: mimeType });
  formData.append("file", blob, fileName);
  formData.append("model", WHISPER_MODEL);
  formData.append("response_format", "json");

  if (input.language?.trim()) {
    formData.append("language", input.language.trim());
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        "[voice-transcription] Whisper failed",
        response.status,
        body.slice(0, 300),
      );
      return null;
    }

    const payload = (await response.json()) as { text?: string };
    const text = payload.text?.trim();

    if (!text) {
      console.warn("[voice-transcription] Whisper returned empty transcript");
      return null;
    }

    console.info("[voice-transcription] transcribed", {
      fileName,
      chars: text.length,
    });

    return text;
  } catch (error) {
    console.error("[voice-transcription] Whisper request error", error);
    return null;
  }
}
