"use server";

import { testChannelAiReply } from "@/services/channel-workspace.service";
import type { TestChannelAiReplyInput } from "@/types/channel-workspace.types";

export async function testChannelAiReplyAction(
  input: TestChannelAiReplyInput,
): Promise<{ success: true; reply: string } | { success: false; message: string }> {
  return testChannelAiReply(input);
}
