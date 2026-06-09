"use server";

import { sendAgentTypingIndicator } from "@/services/conversation-typing.service";

export async function sendAgentTypingAction(conversationId: string) {
  return sendAgentTypingIndicator(conversationId);
}
