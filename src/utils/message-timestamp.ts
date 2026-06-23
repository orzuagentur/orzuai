import type { ChatMessageData } from "@/types/chat.types";

export function parseUnixSecondsToIso(
  value: string | number | undefined | null,
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const seconds =
    typeof value === "string" ? Number.parseInt(value, 10) : value;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }

  return new Date(seconds * 1000).toISOString();
}

export function parseMillisToIso(
  value: string | number | undefined | null,
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const millis =
    typeof value === "string" ? Number.parseInt(value, 10) : value;

  if (!Number.isFinite(millis) || millis <= 0) {
    return undefined;
  }

  return new Date(millis).toISOString();
}

export function getMessageSortTime(
  message: Pick<ChatMessageData, "sentAt" | "createdAt">,
): string {
  return message.sentAt ?? message.createdAt;
}

export function compareMessagesBySentAt(
  left: Pick<ChatMessageData, "sentAt" | "createdAt" | "id">,
  right: Pick<ChatMessageData, "sentAt" | "createdAt" | "id">,
): number {
  const leftTime = new Date(getMessageSortTime(left)).getTime();
  const rightTime = new Date(getMessageSortTime(right)).getTime();

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.id.localeCompare(right.id);
}

export function sortMessagesBySentAt<T extends ChatMessageData>(
  messages: T[],
): T[] {
  return [...messages].sort(compareMessagesBySentAt);
}
