import type { ChatMessageData } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import {
  encodeMediaMessage,
  parseMediaMessage,
  resolveMediaKind,
} from "@/utils/chat-media";

export const OPTIMISTIC_MESSAGE_ID_PREFIX = "pending-";

export function createOptimisticMessageId(): string {
  return `${OPTIMISTIC_MESSAGE_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isOptimisticMessageId(messageId: string): boolean {
  return messageId.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX);
}

export function createOptimisticChatMessage(input: {
  id: string;
  conversationId: string;
  channel: MessagingChannel;
  content: string;
  emailSubject?: string | null;
}): ChatMessageData {
  return {
    id: input.id,
    conversationId: input.conversationId,
    channel: input.channel,
    senderType: "user",
    content: input.content,
    emailSubject: input.emailSubject ?? null,
    aiGenerated: false,
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    deletedForAllAt: null,
    hiddenForBusiness: false,
    editedAt: null,
    isEdited: false,
    isPending: true,
    deliveryStatus: "pending",
  };
}

export function createOptimisticMediaChatMessage(input: {
  id: string;
  conversationId: string;
  channel: MessagingChannel;
  file: File;
  caption?: string;
}): ChatMessageData {
  const mimeType = input.file.type || "application/octet-stream";
  const objectUrl = URL.createObjectURL(input.file);

  return createOptimisticChatMessage({
    id: input.id,
    conversationId: input.conversationId,
    channel: input.channel,
    content: encodeMediaMessage(
      {
        kind: resolveMediaKind(mimeType),
        fileName: input.file.name,
        mimeType,
        url: objectUrl,
        sizeBytes: input.file.size,
      },
      input.caption,
    ),
  });
}

export function revokeOptimisticMediaContent(content: string): void {
  const { media } = parseMediaMessage(content);

  if (media?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(media.url);
  }
}
