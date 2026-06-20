import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONVERSATION_AUTO_REPLY_STATUS_EVENT,
  CONVERSATION_MESSAGE_UPDATED_EVENT,
  CONVERSATION_TYPING_EVENT,
  getConversationRealtimeChannelName,
  type AutoReplyStatusPayload,
  type ConversationMessageUpdatedPayload,
  type ConversationTypingPayload,
  type ConversationTypingSender,
} from "@/lib/realtime/conversation-channel";

const BROADCAST_TIMEOUT_MS = 4_000;

async function broadcastConversationEvent<T>(
  conversationId: string,
  event: string,
  payload: T,
): Promise<void> {
  const supabase = createAdminClient();
  const channelName = getConversationRealtimeChannelName(conversationId);

  await new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      void supabase.removeChannel(channel);
      resolve();
    };

    const timeoutId = setTimeout(finish, BROADCAST_TIMEOUT_MS);

    const channel = supabase.channel(channelName, {
      config: { broadcast: { ack: false, self: false } },
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        return;
      }

      await channel.send({
        type: "broadcast",
        event,
        payload,
      });

      clearTimeout(timeoutId);
      finish();
    });
  });
}

export async function broadcastConversationTyping(
  conversationId: string,
  sender: ConversationTypingSender,
  isTyping: boolean,
): Promise<void> {
  const payload: ConversationTypingPayload = {
    sender,
    isTyping,
    at: Date.now(),
  };

  await broadcastConversationEvent(
    conversationId,
    CONVERSATION_TYPING_EVENT,
    payload,
  );
}

export async function broadcastConversationMessageUpdated(
  conversationId: string,
  message: ConversationMessageUpdatedPayload,
): Promise<void> {
  await broadcastConversationEvent(
    conversationId,
    CONVERSATION_MESSAGE_UPDATED_EVENT,
    message,
  );
}

export async function broadcastAutoReplyStatus(
  conversationId: string,
  payload: AutoReplyStatusPayload,
): Promise<void> {
  await broadcastConversationEvent(
    conversationId,
    CONVERSATION_AUTO_REPLY_STATUS_EVENT,
    payload,
  );
}
