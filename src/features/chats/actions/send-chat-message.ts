"use server";

import { sendChatMessage } from "@/services/chat.service";
import type {
  SendChatMessageInput,
  SendChatMessageResult,
} from "@/types/chat.types";

export async function sendChatMessageAction(
  input: SendChatMessageInput,
): Promise<SendChatMessageResult> {
  return sendChatMessage(input);
}
