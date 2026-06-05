"use server";

import { getConversationCrmAssistant } from "@/services/crm-assistant.service";
import type {
  ConversationCrmAssistantInput,
  ConversationCrmAssistantResult,
} from "@/services/crm-assistant.service";

export async function getConversationCrmAssistantAction(
  input: ConversationCrmAssistantInput,
): Promise<ConversationCrmAssistantResult> {
  return getConversationCrmAssistant(input);
}
