import "server-only";

import type { AutoReplyStatusPayload } from "@/lib/realtime/conversation-channel";
import { broadcastAutoReplyStatus } from "@/services/conversation-realtime-broadcast.service";

async function publishAutoReplyStatus(
  conversationId: string,
  payload: Omit<AutoReplyStatusPayload, "at">,
): Promise<void> {
  try {
    await broadcastAutoReplyStatus(conversationId, {
      ...payload,
      at: Date.now(),
    });
  } catch (error) {
    console.error("[auto-reply-inbox] broadcast failed", error);
  }
}

export async function notifyAutoReplyTyping(
  conversationId: string,
  isTyping: boolean,
): Promise<void> {
  await publishAutoReplyStatus(conversationId, {
    status: isTyping ? "typing" : "idle",
  });
}

export async function notifyAutoReplyError(
  conversationId: string,
  input: {
    errorCode: string;
    errorMessage: string;
  },
): Promise<void> {
  await publishAutoReplyStatus(conversationId, {
    status: "error",
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  });
}
