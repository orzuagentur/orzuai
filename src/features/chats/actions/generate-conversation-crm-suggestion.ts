"use server";

import { getConversationCrmAssistant } from "@/services/crm-assistant.service";
import type { ConversationCrmAssistantResult } from "@/services/crm-assistant.service";

export async function generateConversationCrmSuggestionAction(input: {
  conversationId: string;
}): Promise<ConversationCrmAssistantResult> {
  return getConversationCrmAssistant({
    conversationId: input.conversationId,
    generateLlmSuggestion: true,
  });
}
