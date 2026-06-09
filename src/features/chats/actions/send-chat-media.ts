"use server";

import { sendChatMedia } from "@/services/chat-media.service";
import type { SendChatMessageResult } from "@/types/chat.types";

export async function sendChatMediaAction(
  formData: FormData,
): Promise<SendChatMessageResult> {
  const conversationId = formData.get("conversationId");
  const file = formData.get("file");
  const caption = formData.get("caption");

  if (typeof conversationId !== "string" || !(file instanceof File)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid media upload request.",
      },
    };
  }

  return sendChatMedia({
    conversationId,
    file,
    caption: typeof caption === "string" ? caption : undefined,
  });
}
