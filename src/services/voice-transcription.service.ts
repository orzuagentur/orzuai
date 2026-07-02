import "server-only";

import {
  estimateAudioDurationSeconds,
} from "@/lib/ai/cost";
import { resolvePlatformAiForUseCase } from "@/services/platform-ai-config.service";
import { logAiUsage } from "@/services/ai-usage.service";
import { resolveSecretValue } from "@/lib/secrets/resolver";
import { ENV_KEYS } from "@/constants/env-keys";

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

async function resolveOpenAiApiKeyForStt(): Promise<string | null> {
  const fromUseCase = await resolvePlatformAiForUseCase("voice_message_stt");
  if (fromUseCase?.apiKey?.trim()) {
    return fromUseCase.apiKey.trim();
  }

  return resolveSecretValue(ENV_KEYS.OPENAI_API_KEY)?.trim() ?? null;
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
  businessId: string;
  conversationId?: string | null;
}): Promise<string | null> {
  const apiKey = await resolveOpenAiApiKeyForStt();

  if (!apiKey) {
    console.warn(
      "[voice-transcription] OpenAI key missing for voice_message_stt, skipping Whisper",
    );
    return null;
  }

  const fileName = resolveTranscriptionFileName(input.fileName, input.mimeType);
  const mimeType = input.mimeType.trim() || "audio/ogg";
  const durationSeconds = estimateAudioDurationSeconds(
    input.buffer.length,
    mimeType,
  );

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

    await logAiUsage({
      businessId: input.businessId,
      conversationId: input.conversationId ?? null,
      provider: "openai",
      model: WHISPER_MODEL,
      inputTokens: durationSeconds,
      outputTokens: text.length,
      billingSource: "platform",
      callType: "voice_stt",
    });

    console.info("[voice-transcription] transcribed", {
      fileName,
      chars: text.length,
      durationSeconds,
    });

    return text;
  } catch (error) {
    console.error("[voice-transcription] Whisper request error", error);
    return null;
  }
}
