export type ChatMediaKind = "image" | "audio" | "document" | "video";

export type ChatMediaPayload = {
  kind: ChatMediaKind;
  url: string;
  fileName: string;
  mimeType: string;
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

    if (!media.url || !media.kind) {
      return { media: null, text: content };
    }

    return { media, text };
  } catch {
    return { media: null, text: content };
  }
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

export function resolveWhatsAppMediaKind(mimeType: string): ChatMediaKind {
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
