"use server";

import {
  completeChatMediaUpload,
  prepareChatMediaUpload,
} from "@/services/chat-media-upload.service";
import type { SendChatMessageResult } from "@/types/chat.types";

export async function prepareChatMediaUploadAction(input: {
  conversationId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  return prepareChatMediaUpload(input);
}

export async function completeChatMediaUploadAction(input: {
  conversationId: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
}): Promise<SendChatMessageResult> {
  return completeChatMediaUpload(input);
}
