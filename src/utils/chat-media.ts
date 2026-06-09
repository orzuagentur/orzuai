import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";

export type ChatMediaKind = "image" | "audio" | "document" | "video";

export type ChatMediaPayload = {
  kind: ChatMediaKind;
  fileName: string;
  mimeType: string;
  /** Storage object path inside chat-attachments bucket */
  path?: string;
  /** Legacy field — public URL stored before path-based storage */
  url?: string;
  sizeBytes?: number;
  durationSec?: number;
};

const MEDIA_TOKEN = "[[orzu-media:";

export function encodeMediaMessage(
  media: ChatMediaPayload,
  caption?: string,
): string {
  const payload = JSON.stringify(media);
  const trimmedCaption = caption?.trim();

  if (trimmedCaption) {
    return `${MEDIA_TOKEN}${payload}]]\n${trimmedCaption}`;
  }

  return `${MEDIA_TOKEN}${payload}]]`;
}

export function parseMediaMessage(content: string): {
  media: ChatMediaPayload | null;
  text: string;
} {
  if (!content.startsWith(MEDIA_TOKEN)) {
    return { media: null, text: content };
  }

  const endIndex = content.indexOf("]]");

  if (endIndex === -1) {
    return { media: null, text: content };
  }

  try {
    const json = content.slice(MEDIA_TOKEN.length, endIndex);
    const media = JSON.parse(json) as ChatMediaPayload;
    const text = content.slice(endIndex + 2).trimStart();

    if (!media.kind) {
      return { media: null, text: content };
    }

    return { media, text };
  } catch {
    return { media: null, text: content };
  }
}

export function extractStoragePathFromUrl(url: string): string | null {
  const publicMarker = `/object/public/${CHAT_ATTACHMENTS_BUCKET}/`;
  const signedMarker = `/object/sign/${CHAT_ATTACHMENTS_BUCKET}/`;

  for (const marker of [publicMarker, signedMarker]) {
    const index = url.indexOf(marker);

    if (index !== -1) {
      const raw = url.slice(index + marker.length);
      return raw.split("?")[0] ?? null;
    }
  }

  return null;
}

export function resolveMediaStoragePath(media: ChatMediaPayload): string | null {
  if (media.path?.trim()) {
    return media.path.trim();
  }

  if (media.url?.trim()) {
    return extractStoragePathFromUrl(media.url);
  }

  return null;
}

export function formatMediaFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMediaPreviewLabel(kind: ChatMediaKind, fileName: string): string {
  if (kind === "image") {
    return "Photo";
  }

  if (kind === "audio") {
    return "Voice message";
  }

  if (kind === "video") {
    return "Video";
  }

  return fileName || "File";
}

export function resolveMediaKind(mimeType: string): ChatMediaKind {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "document";
}

/** @deprecated Use resolveMediaKind */
export function resolveWhatsAppMediaKind(mimeType: string): ChatMediaKind {
  return resolveMediaKind(mimeType);
}

export function getMessagePlainText(content: string): string {
  const { media, text } = parseMediaMessage(content);

  if (!media) {
    return content;
  }

  const label = getMediaPreviewLabel(media.kind, media.fileName);

  if (text) {
    return `${label}: ${text}`;
  }

  return label;
}

export function buildInboundMediaFallbackContent(
  kind: ChatMediaKind,
  caption?: string,
  fileName?: string,
): string {
  const label = getMediaPreviewLabel(kind, fileName ?? "");
  const trimmedCaption = caption?.trim();

  if (trimmedCaption) {
    return `${label}: ${trimmedCaption}`;
  }

  return label;
}

export function getMessagePreviewText(content: string, maxLength = 80): string {
  const plain = getMessagePlainText(content).trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength - 1)}…`;
}

export function buildMediaPayloadFromUpload(input: {
  kind: ChatMediaKind;
  fileName: string;
  mimeType: string;
  path: string;
  sizeBytes: number;
  legacyUrl?: string;
}): ChatMediaPayload {
  return {
    kind: input.kind,
    fileName: input.fileName,
    mimeType: input.mimeType,
    path: input.path,
    sizeBytes: input.sizeBytes,
    url: input.legacyUrl,
  };
}
