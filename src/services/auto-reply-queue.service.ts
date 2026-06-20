import "server-only";

import type { MessagingChannel } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { notifyAutoReplyTyping } from "@/services/auto-reply-inbox-status.service";

type MessagingDbClient = SupabaseClient<Database>;

const AUTO_REPLY_DEBOUNCE_MS = 3_000;

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
  timer: ReturnType<typeof setTimeout>;
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
    clearTimeout(existing.timer);
    existing.messages.push(trimmedMessage);
    existing.sendReply = input.sendReply;
    existing.timer = setTimeout(() => {
      void flushPendingAutoReply(key).catch((error) => {
        console.error("[auto-reply-queue] flush failed", error);
      });
    }, AUTO_REPLY_DEBOUNCE_MS);
    void notifyAutoReplyTyping(input.conversationId, true);
    return;
  }

  const pending: PendingAutoReply = {
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    conversationId: input.conversationId,
    messages: [trimmedMessage],
    sendReply: input.sendReply,
    timer: setTimeout(() => {
      void flushPendingAutoReply(key).catch((error) => {
        console.error("[auto-reply-queue] flush failed", error);
      });
    }, AUTO_REPLY_DEBOUNCE_MS),
  };

  pendingByConversation.set(key, pending);
  void notifyAutoReplyTyping(input.conversationId, true);
}

export function getAutoReplyDebounceMs(): number {
  return AUTO_REPLY_DEBOUNCE_MS;
}
