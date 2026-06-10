"use server";

import { deleteChatMessage } from "@/services/chat-message-actions.service";
import type {
  DeleteChatMessageInput,
  DeleteChatMessageResult,
} from "@/types/chat.types";

export async function deleteChatMessageAction(
  input: DeleteChatMessageInput,
): Promise<DeleteChatMessageResult> {
  return deleteChatMessage(input);
}
