import type { ChatMessageData } from "@/types/chat.types";

export type MessageUploadProgressState = {
  percent: number;
  bytesPerSecond?: number;
  phase: NonNullable<ChatMessageData["uploadPhase"]>;
};

type Listener = () => void;

const progressByMessageId = new Map<string, MessageUploadProgressState>();
const listenersByMessageId = new Map<string, Set<Listener>>();

function notify(messageId: string): void {
  const listeners = listenersByMessageId.get(messageId);

  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener();
  }
}

export function setMessageUploadProgress(
  messageId: string,
  state: MessageUploadProgressState,
): void {
  progressByMessageId.set(messageId, state);
  notify(messageId);
}

export function clearMessageUploadProgress(messageId: string): void {
  if (!progressByMessageId.has(messageId)) {
    return;
  }

  progressByMessageId.delete(messageId);
  notify(messageId);
}

export function getMessageUploadProgress(
  messageId: string,
): MessageUploadProgressState | null {
  return progressByMessageId.get(messageId) ?? null;
}

export function subscribeMessageUploadProgress(
  messageId: string,
  listener: Listener,
): () => void {
  const listeners =
    listenersByMessageId.get(messageId) ?? new Set<Listener>();

  listeners.add(listener);
  listenersByMessageId.set(messageId, listeners);

  return () => {
    const current = listenersByMessageId.get(messageId);

    if (!current) {
      return;
    }

    current.delete(listener);

    if (current.size === 0) {
      listenersByMessageId.delete(messageId);
    }
  };
}
