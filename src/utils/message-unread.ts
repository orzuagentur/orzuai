import type { ChatMessageData } from "@/types/chat.types";
import { getMessageSortTime } from "@/utils/message-timestamp";

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
    new Date(getMessageSortTime(message)).getTime() > new Date(lastReadAt).getTime()
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
