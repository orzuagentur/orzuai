import "server-only";

import { downloadTelegramFile } from "@/lib/telegram/client";
import { downloadWhatsAppMedia } from "@/lib/whatsapp/client";
import { uploadChatAttachmentBuffer } from "@/services/chat-attachment-storage.service";
import {
  buildMediaPayloadFromUpload,
  encodeMediaMessage,
  resolveMediaKind,
  type ChatMediaKind,
} from "@/utils/chat-media";

type PersistInboundMediaInput = {
  businessId: string;
  conversationId: string;
  kind: ChatMediaKind;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  caption?: string;
};

export async function persistInboundMediaMessage(
  input: PersistInboundMediaInput,
): Promise<string | null> {
  const stored = await uploadChatAttachmentBuffer(
    input.businessId,
    input.conversationId,
    input.buffer,
    {
      fileName: input.fileName,
      mimeType: input.mimeType,
    },
  );

  if (!stored?.url) {
    return null;
  }

  return encodeMediaMessage(
    buildMediaPayloadFromUpload({
      kind: input.kind,
      fileName: input.fileName,
      mimeType: input.mimeType,
      path: stored.path,
      sizeBytes: stored.sizeBytes,
      legacyUrl: stored.url,
    }),
    input.caption,
  );
}

export async function downloadAndStoreWhatsAppInboundMedia(input: {
  accessToken: string;
  mediaId: string;
  businessId: string;
  conversationId: string;
  kind: ChatMediaKind;
  fileName?: string;
  mimeType?: string;
  caption?: string;
}): Promise<string | null> {
  const downloaded = await downloadWhatsAppMedia(
    input.accessToken,
    input.mediaId,
    input.fileName ?? "whatsapp-media",
  );

  if (!downloaded.success) {
    return null;
  }

  return persistInboundMediaMessage({
    businessId: input.businessId,
    conversationId: input.conversationId,
    kind: input.kind,
    buffer: downloaded.buffer,
    mimeType: input.mimeType || downloaded.mimeType,
    fileName: downloaded.fileName,
    caption: input.caption,
  });
}

export async function downloadAndStoreTelegramInboundMedia(input: {
  botToken: string;
  fileId: string;
  businessId: string;
  conversationId: string;
  kind: ChatMediaKind;
  fileName?: string;
  mimeType?: string;
  caption?: string;
}): Promise<string | null> {
  const downloaded = await downloadTelegramFile(
    input.botToken,
    input.fileId,
    input.fileName ?? "telegram-media",
  );

  if (!downloaded.success) {
    return null;
  }

  return persistInboundMediaMessage({
    businessId: input.businessId,
    conversationId: input.conversationId,
    kind: input.kind,
    buffer: downloaded.buffer,
    mimeType: input.mimeType || downloaded.mimeType,
    fileName: downloaded.fileName,
    caption: input.caption,
  });
}

export async function downloadAndStoreUrlInboundMedia(input: {
  sourceUrl: string;
  businessId: string;
  conversationId: string;
  kind: ChatMediaKind;
  fileName?: string;
  mimeType?: string;
  caption?: string;
  accessToken?: string;
}): Promise<string | null> {
  const headers: HeadersInit = {};

  if (input.accessToken) {
    headers.Authorization = `Bearer ${input.accessToken}`;
  }

  const response = await fetch(input.sourceUrl, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const mimeType =
    input.mimeType ||
    response.headers.get("content-type") ||
    "application/octet-stream";
  const fileName = input.fileName || `media-${Date.now()}`;
  const buffer = Buffer.from(await response.arrayBuffer());

  return persistInboundMediaMessage({
    businessId: input.businessId,
    conversationId: input.conversationId,
    kind: input.kind || resolveMediaKind(mimeType),
    buffer,
    mimeType,
    fileName,
    caption: input.caption,
  });
}
