import type { ChatMessageData } from "@/types/chat.types";

/** Fields that can change without a messages.content update. */
export type ChatMessageMetadataPatch = Partial<
  Pick<
    ChatMessageData,
    | "deliveryStatus"
    | "attachmentPending"
    | "attachmentFailed"
    | "deletedForAllAt"
    | "hiddenForBusiness"
    | "editedAt"
    | "isEdited"
    | "isPending"
    | "uploadProgress"
    | "uploadSpeedBps"
    | "uploadPhase"
    | "content"
  >
>;

export function hasMessageMetadataChanged(
  previous: ChatMessageData,
  next: ChatMessageData,
): boolean {
  return (
    previous.content !== next.content ||
    previous.deliveryStatus !== next.deliveryStatus ||
    previous.attachmentPending !== next.attachmentPending ||
    previous.attachmentFailed !== next.attachmentFailed ||
    previous.deletedForAllAt !== next.deletedForAllAt ||
    previous.hiddenForBusiness !== next.hiddenForBusiness ||
    previous.editedAt !== next.editedAt ||
    previous.isEdited !== next.isEdited ||
    previous.isPending !== next.isPending ||
    previous.uploadProgress !== next.uploadProgress ||
    previous.uploadSpeedBps !== next.uploadSpeedBps ||
    previous.uploadPhase !== next.uploadPhase
  );
}

export function mergeMessageMetadata(
  message: ChatMessageData,
  patch: ChatMessageMetadataPatch,
): ChatMessageData {
  return {
    ...message,
    ...patch,
  };
}

export function applyMessageMetadataPatch(
  messages: ChatMessageData[],
  messageId: string,
  patch: ChatMessageMetadataPatch,
): ChatMessageData[] | null {
  const index = messages.findIndex((item) => item.id === messageId);

  if (index === -1) {
    return null;
  }

  const current = messages[index]!;
  const next = mergeMessageMetadata(current, patch);

  if (!hasMessageMetadataChanged(current, next)) {
    return null;
  }

  const copy = [...messages];
  copy[index] = next;
  return copy;
}
