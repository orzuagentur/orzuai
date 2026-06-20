import type { ChatMediaKind } from "@/utils/chat-media";

const VOICE_NOTE_FILE_PATTERN = /^voice-/i;

const TELEGRAM_VOICE_MIME_TYPES = new Set(["audio/ogg", "audio/opus"]);

export function isOutboundVoiceNote(input: {
  fileName: string;
  mimeType: string;
  kind?: ChatMediaKind;
}): boolean {
  if (input.kind && input.kind !== "audio") {
    return false;
  }

  const mimeType = input.mimeType.toLowerCase();

  if (!mimeType.startsWith("audio/")) {
    return false;
  }

  return VOICE_NOTE_FILE_PATTERN.test(input.fileName.trim());
}

export function needsVoiceNoteTranscode(input: {
  fileName: string;
  mimeType: string;
  kind?: ChatMediaKind;
}): boolean {
  if (!isOutboundVoiceNote(input)) {
    return false;
  }

  const normalizedMime = input.mimeType.toLowerCase().split(";")[0]!.trim();

  return !TELEGRAM_VOICE_MIME_TYPES.has(normalizedMime);
}

export function buildVoiceNoteOggFileName(fileName: string): string {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return "voice.ogg";
  }

  return trimmed.replace(/\.[^/.]+$/, "") + ".ogg";
}

export function buildVoiceNoteOggStoragePath(storagePath: string): string {
  return storagePath.replace(/\.[^/.]+$/, "") + ".ogg";
}
