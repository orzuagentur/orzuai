import "server-only";

import { after } from "next/server";

import type { MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { notifyAutoReplyTyping } from "@/services/auto-reply-inbox-status.service";

type MessagingDbClient = SupabaseClient<Database>;

const AUTO_REPLY_DEBOUNCE_MS = 1_500;

type ChannelAutoReplyJob = {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  clientMessage: string;
  sendReply: (text: string) => Promise<{ success: boolean }>;
};

type PendingAutoReply = {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  messages: string[];
  sendReply: (text: string) => Promise<{ success: boolean }>;
  debounceUntil: number;
  backgroundTaskStarted: boolean;
};

const pendingByConversation = new Map<string, PendingAutoReply>();

function buildQueueKey(input: {
  businessId: string;
  conversationId: string;
}): string {
  return `${input.businessId}:${input.conversationId}`;
}

function combineClientMessages(messages: string[]): string {
  return messages
    .map((message) => message.trim())
    .filter(Boolean)
    .join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForDebounceQuiet(key: string): Promise<void> {
  while (true) {
    const pending = pendingByConversation.get(key);

    if (!pending) {
      return;
    }

    const remaining = pending.debounceUntil - Date.now();

    if (remaining <= 0) {
      return;
    }

    await sleep(Math.min(remaining, 250));
  }
}

async function flushPendingAutoReply(key: string): Promise<void> {
  const pending = pendingByConversation.get(key);

  if (!pending) {
    return;
  }

  pendingByConversation.delete(key);

  const clientMessage = combineClientMessages(pending.messages);

  if (!clientMessage) {
    await notifyAutoReplyTyping(pending.conversationId, false);
    return;
  }

  try {
    const { processChannelAutoReply } = await import("@/services/messaging.service");

    await processChannelAutoReply({
      admin: pending.admin,
      businessId: pending.businessId,
      channel: pending.channel,
      conversationId: pending.conversationId,
      clientMessage,
      sendReply: pending.sendReply,
    });
  } finally {
    await notifyAutoReplyTyping(pending.conversationId, false);
  }
}

function ensureBackgroundFlush(key: string): void {
  const pending = pendingByConversation.get(key);

  if (!pending || pending.backgroundTaskStarted) {
    return;
  }

  pending.backgroundTaskStarted = true;

  after(async () => {
    try {
      await waitForDebounceQuiet(key);
      await flushPendingAutoReply(key);
    } catch (error) {
      console.error("[auto-reply-queue] background flush failed", error);

      const stillPending = pendingByConversation.get(key);

      if (stillPending) {
        stillPending.backgroundTaskStarted = false;
        await notifyAutoReplyTyping(stillPending.conversationId, false);
      }
    }
  });
}

export function scheduleDebouncedChannelAutoReply(
  input: ChannelAutoReplyJob,
): void {
  const key = buildQueueKey(input);
  const trimmedMessage = input.clientMessage.trim();

  if (!trimmedMessage) {
    return;
  }

  const existing = pendingByConversation.get(key);

  if (existing) {
    existing.messages.push(trimmedMessage);
    existing.sendReply = input.sendReply;
    existing.admin = input.admin;
    existing.debounceUntil = Date.now() + AUTO_REPLY_DEBOUNCE_MS;
    existing.backgroundTaskStarted = false;
    void notifyAutoReplyTyping(input.conversationId, true);
    ensureBackgroundFlush(key);
    return;
  }

  const pending: PendingAutoReply = {
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    conversationId: input.conversationId,
    messages: [trimmedMessage],
    sendReply: input.sendReply,
    debounceUntil: Date.now() + AUTO_REPLY_DEBOUNCE_MS,
    backgroundTaskStarted: false,
  };

  pendingByConversation.set(key, pending);
  void notifyAutoReplyTyping(input.conversationId, true);
  ensureBackgroundFlush(key);
}

export function getAutoReplyDebounceMs(): number {
  return AUTO_REPLY_DEBOUNCE_MS;
}
