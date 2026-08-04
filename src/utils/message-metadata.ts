import type { ChatMessageData } from "@/types/chat.types";
import type { MessageDeliveryStatus } from "@/types/database.types";

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

const STABLE_OUTBOUND_DELIVERY_STATUSES = new Set<MessageDeliveryStatus>([
  "sent",
  "delivered",
  "read",
]);

export function shouldIgnoreOutboundDeliveryDowngrade(
  currentStatus: MessageDeliveryStatus | null | undefined,
  nextStatus: MessageDeliveryStatus,
): boolean {
  if (!currentStatus || !STABLE_OUTBOUND_DELIVERY_STATUSES.has(currentStatus)) {
    return false;
  }

  return nextStatus === "pending" || nextStatus === "processing";
}

export function normalizeOutboundDeliveryStatus(
  message: ChatMessageData,
): ChatMessageData {
  if (
    (message.senderType !== "user" && message.senderType !== "ai") ||
    message.hiddenForBusiness
  ) {
    return message;
  }

  if (message.deliveryStatus === "failed") {
    return { ...message, isPending: false };
  }

  if (
    !message.deliveryStatus ||
    message.deliveryStatus === "pending" ||
    message.deliveryStatus === "processing"
  ) {
    return {
      ...message,
      isPending: false,
      deliveryStatus: message.deliveryStatus ?? "pending",
    };
  }

  return { ...message, isPending: false };
}

export function mergeIncomingChatMessage(
  previous: ChatMessageData | null | undefined,
  incoming: ChatMessageData,
): ChatMessageData {
  const merged: ChatMessageData = {
    ...incoming,
    deliveryStatus: incoming.deliveryStatus ?? previous?.deliveryStatus,
    attachmentPending:
      incoming.attachmentPending ?? previous?.attachmentPending,
    attachmentFailed: incoming.attachmentFailed ?? previous?.attachmentFailed,
    isPending: false,
  };

  if (merged.senderType === "user" || merged.senderType === "ai") {
    return normalizeOutboundDeliveryStatus(merged);
  }

  return merged;
}

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
