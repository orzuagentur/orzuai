"use server";

import { toggleChatAi } from "@/services/chat.service";
import type { ToggleChatAiInput, ToggleChatAiResult } from "@/types/chat.types";

export async function toggleChatAiAction(
  input: ToggleChatAiInput,
): Promise<ToggleChatAiResult> {
  return toggleChatAi(input);
}
