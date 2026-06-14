"use server";

import { retryInboundMediaAttachment } from "@/services/chat-message-actions.service";
import type {
  ChatActionResult,
  RetryInboundMediaAttachmentInput,
} from "@/types/chat.types";

export async function retryInboundMediaAttachmentAction(
  input: RetryInboundMediaAttachmentInput,
): Promise<ChatActionResult<{ messageId: string }>> {
  return retryInboundMediaAttachment(input);
}
