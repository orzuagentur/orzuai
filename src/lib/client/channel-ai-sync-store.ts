import type { MessagingChannel } from "@/types/database.types";

type Listener = () => void;

const overrides = new Map<MessagingChannel, boolean>();
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function syncChannelAiEnabled(
  channel: MessagingChannel,
  enabled: boolean,
): void {
  overrides.set(channel, enabled);
  notify();
}

export function syncChannelAiEnabledBulk(
  entries: Array<{ channel: MessagingChannel; enabled: boolean }>,
): void {
  for (const entry of entries) {
    overrides.set(entry.channel, entry.enabled);
  }

  notify();
}

export function getSyncedChannelAiEnabled(
  channel: MessagingChannel,
): boolean | undefined {
  return overrides.get(channel);
}

export function resolveChannelAiEnabled(
  channel: MessagingChannel,
  serverValue: boolean | null,
): boolean | null {
  if (serverValue === null) {
    return null;
  }

  const synced = overrides.get(channel);

  if (synced !== undefined) {
    return synced;
  }

  return serverValue;
}

export function clearSyncedChannelAiEnabled(channel: MessagingChannel): void {
  if (!overrides.has(channel)) {
    return;
  }

  overrides.delete(channel);
  notify();
}

export function subscribeChannelAiSync(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function captureChannelAiOverride(
  channel: MessagingChannel,
): boolean | undefined {
  return overrides.get(channel);
}

export function restoreChannelAiOverride(
  channel: MessagingChannel,
  previous: boolean | undefined,
): void {
  if (previous === undefined) {
    overrides.delete(channel);
  } else {
    overrides.set(channel, previous);
  }

  notify();
}
