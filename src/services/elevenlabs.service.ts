import "server-only";

import {
  getCachedElevenLabsApiKey,
  resolveElevenLabsApiKey,
} from "@/lib/ai/platform-api-keys";
import { getElevenLabsApiKey as getLegacyElevenLabsApiKey } from "@/lib/env";
import { schedulePlatformErrorReport } from "@/services/error-intelligence.service";
import type { ElevenLabsVoiceSummary } from "@/types/elevenlabs.types";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";

type ElevenLabsVoiceApiRow = {
  voice_id: string;
  name: string;
  preview_url?: string | null;
  category?: string | null;
  labels?: Record<string, string> | null;
  description?: string | null;
};

function mapVoiceRow(voice: ElevenLabsVoiceApiRow): ElevenLabsVoiceSummary {
  const labels = voice.labels ?? {};

  return {
    voiceId: voice.voice_id,
    name: voice.name,
    previewUrl: voice.preview_url?.trim() || null,
    category: voice.category?.trim() || null,
    accent: labels.accent?.trim() || null,
    gender: labels.gender?.trim() || null,
    age: labels.age?.trim() || null,
    description: voice.description?.trim() || null,
  };
}

async function resolveApiKey(): Promise<string | null> {
  return (await resolveElevenLabsApiKey()) ?? getLegacyElevenLabsApiKey() ?? null;
}

export function hasElevenLabsConfigured(): boolean {
  return Boolean(getCachedElevenLabsApiKey() || getLegacyElevenLabsApiKey());
}

export async function listElevenLabsVoices(): Promise<{
  success: boolean;
  voices: ElevenLabsVoiceSummary[];
  message?: string;
}> {
  const apiKey = await resolveApiKey();

  if (!apiKey) {
    return {
      success: false,
      voices: [],
      message: "ElevenLabs API is not configured.",
    };
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: {
        "xi-api-key": apiKey,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        "[elevenlabs] list voices failed",
        response.status,
        body.slice(0, 300),
      );
      return {
        success: false,
        voices: [],
        message: "Unable to load ElevenLabs voices.",
      };
    }

    const payload = (await response.json()) as {
      voices?: ElevenLabsVoiceApiRow[];
    };

    const voices = (payload.voices ?? [])
      .map(mapVoiceRow)
      .sort((left, right) => left.name.localeCompare(right.name));

    return { success: true, voices };
  } catch (error) {
    console.error("[elevenlabs] list voices error", error);
    return {
      success: false,
      voices: [],
      message: "Unable to load ElevenLabs voices.",
    };
  }
}

export async function synthesizeElevenLabsSpeech(input: {
  text: string;
  voiceId: string;
  languageCode?: string;
  modelId?: string;
}): Promise<{ success: true; buffer: Buffer; mimeType: string } | { success: false; message: string }> {
  const apiKey = await resolveApiKey();
  const text = input.text.trim();

  if (!apiKey) {
    return { success: false, message: "ElevenLabs API is not configured." };
  }

  if (!text) {
    return { success: false, message: "Text is empty." };
  }

  if (!input.voiceId.trim()) {
    return { success: false, message: "Voice is not selected." };
  }

  try {
    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(input.voiceId.trim())}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: input.modelId?.trim() || DEFAULT_TTS_MODEL,
          language_code: input.languageCode?.trim() || undefined,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        "[elevenlabs] synthesize failed",
        response.status,
        body.slice(0, 300),
      );
      schedulePlatformErrorReport({
        severity: "high",
        module: "voice",
        category: "tts",
        source: "elevenlabs",
        title: "ElevenLabs TTS synthesize failed",
        message: `HTTP ${response.status}: ${body.slice(0, 240)}`,
        httpStatus: response.status,
        context: {
          voiceId: input.voiceId.trim(),
          modelId: input.modelId?.trim() || DEFAULT_TTS_MODEL,
        },
        rootCause: "ElevenLabs text-to-speech API returned a non-OK response.",
        suggestedFix: "Verify ElevenLabs API key, voice ID, and account quota.",
      });
      return {
        success: false,
        message: "Unable to synthesize speech.",
      };
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      success: true,
      buffer: Buffer.from(arrayBuffer),
      mimeType: "audio/mpeg",
    };
  } catch (error) {
    console.error("[elevenlabs] synthesize error", error);
    schedulePlatformErrorReport({
      severity: "high",
      module: "voice",
      category: "tts",
      source: "elevenlabs",
      title: "ElevenLabs TTS synthesize error",
      message: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack ?? null : null,
      context: {
        voiceId: input.voiceId.trim(),
      },
      rootCause: "ElevenLabs text-to-speech request threw.",
      suggestedFix: "Check network connectivity and ElevenLabs API status.",
    });
    return {
      success: false,
      message: "Unable to synthesize speech.",
    };
  }
}
