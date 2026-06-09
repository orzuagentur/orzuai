import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONVERSATION_TYPING_EVENT,
  getConversationRealtimeChannelName,
  type ConversationTypingPayload,
  type ConversationTypingSender,
} from "@/lib/realtime/conversation-channel";

const BROADCAST_TIMEOUT_MS = 4_000;

export async function broadcastConversationTyping(
  conversationId: string,
  sender: ConversationTypingSender,
  isTyping: boolean,
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

      const payload: ConversationTypingPayload = {
        sender,
        isTyping,
        at: Date.now(),
      };

      await channel.send({
        type: "broadcast",
        event: CONVERSATION_TYPING_EVENT,
        payload,
      });

      clearTimeout(timeoutId);
      finish();
    });
  });
}
