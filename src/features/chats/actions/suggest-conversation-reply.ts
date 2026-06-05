"use server";

import { suggestConversationReply } from "@/services/chat.service";
import type {
  SuggestConversationReplyInput,
  SuggestConversationReplyResult,
} from "@/types/chat.types";

export async function suggestConversationReplyAction(
  input: SuggestConversationReplyInput,
): Promise<SuggestConversationReplyResult> {
  return suggestConversationReply(input);
}
