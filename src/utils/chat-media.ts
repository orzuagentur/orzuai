import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";

export type ChatMediaKind = "image" | "audio" | "document" | "video";

export type ChatMediaPayload = {
  kind: ChatMediaKind;
  fileName: string;
  mimeType: string;
  /** Storage object path inside chat-attachments bucket */
  path?: string;
  /** JPEG thumbnail path for image previews */
  thumbPath?: string;
  thumbWidth?: number;
  thumbHeight?: number;
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
    return parseLegacyMediaFallback(content);
  }

  const endIndex = content.indexOf("]]");

  if (endIndex === -1) {
    return parseLegacyMediaFallback(content);
  }

  try {
    const json = content.slice(MEDIA_TOKEN.length, endIndex);
    const media = JSON.parse(json) as ChatMediaPayload;
    const text = content.slice(endIndex + 2).trimStart();

    if (!media.kind) {
      return parseLegacyMediaFallback(content);
    }

    return { media, text };
  } catch {
    return parseLegacyMediaFallback(content);
  }
}

const LEGACY_MEDIA_LABELS: Record<string, ChatMediaKind> = {
  Photo: "image",
  "Voice message": "audio",
  Video: "video",
};

function buildLegacyMediaPayload(
  kind: ChatMediaKind,
  fileName: string,
): ChatMediaPayload {
  return {
    kind,
    fileName,
    mimeType: "",
    sizeBytes: 0,
  };
}

function parseLegacyMediaFallback(content: string): {
  media: ChatMediaPayload | null;
  text: string;
} {
  const trimmed = content.trim();

  for (const [label, kind] of Object.entries(LEGACY_MEDIA_LABELS)) {
    if (trimmed === label) {
      return {
        media: buildLegacyMediaPayload(kind, label),
        text: "",
      };
    }

    const prefix = `${label}: `;

    if (trimmed.startsWith(prefix)) {
      return {
        media: buildLegacyMediaPayload(kind, label),
        text: trimmed.slice(prefix.length),
      };
    }
  }

  return { media: null, text: content };
}

export function isMediaPendingHydration(media: ChatMediaPayload): boolean {
  if (media.url?.startsWith("blob:")) {
    return false;
  }

  return !resolveMediaStoragePath(media) && !media.url?.trim();
}

export function buildMediaUrlCacheKey(
  media: ChatMediaPayload,
  messageId?: string,
): string | undefined {
  const storagePath = resolveMediaStoragePath(media);

  if (storagePath) {
    return storagePath;
  }

  if (media.url?.trim()) {
    return media.url.trim();
  }

  if (messageId) {
    return `message:${messageId}`;
  }

  return undefined;
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

export function shouldDeferAutoReplyForInboundVoice(content: string): boolean {
  const { media } = parseMediaMessage(content);

  return media?.kind === "audio";
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
  return encodeMediaMessage(
    {
      kind,
      fileName: fileName?.trim() || getMediaPreviewLabel(kind, ""),
      mimeType: "application/octet-stream",
      sizeBytes: 0,
    },
    caption,
  );
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
  thumbPath?: string;
  thumbWidth?: number;
  thumbHeight?: number;
}): ChatMediaPayload {
  return {
    kind: input.kind,
    fileName: input.fileName,
    mimeType: input.mimeType,
    path: input.path,
    sizeBytes: input.sizeBytes,
    url: input.legacyUrl,
    thumbPath: input.thumbPath,
    thumbWidth: input.thumbWidth,
    thumbHeight: input.thumbHeight,
  };
}
