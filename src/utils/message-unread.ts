import type { ChatMessageData } from "@/types/chat.types";

export function isUnreadClientMessage(
  message: ChatMessageData,
  lastReadAt: string | null,
): boolean {
  if (message.senderType !== "client") {
    return false;
  }

  if (!lastReadAt) {
    return true;
  }

  return (
    new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime()
  );
}

export function findFirstUnreadClientMessageIndex(
  messages: ChatMessageData[],
  lastReadAt: string | null,
): number {
  return messages.findIndex((message) =>
    isUnreadClientMessage(message, lastReadAt),
  );
}
