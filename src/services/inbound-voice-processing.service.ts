import "server-only";

import { downloadChatAttachmentBuffer } from "@/services/chat-attachment-signed-url.service";
import {
  scheduleInboundMessageProcessing,
  updateChannelMessageContent,
} from "@/services/messaging.service";
import { transcribeAudioBuffer } from "@/services/voice-transcription.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import {
  encodeMediaMessage,
  parseMediaMessage,
  resolveMediaStoragePath,
  shouldDeferAutoReplyForInboundVoice,
} from "@/utils/chat-media";
import type { SupabaseClient } from "@supabase/supabase-js";

type VoiceMessageRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  sender_type: Database["public"]["Enums"]["message_sender_type"];
};

export async function processInboundVoiceAfterHydration(input: {
  admin: SupabaseClient<Database>;
  businessId: string;
  message: VoiceMessageRow;
  content: string;
}): Promise<string> {
  if (!shouldDeferAutoReplyForInboundVoice(input.content)) {
    return input.content;
  }

  if (input.message.sender_type !== "client") {
    return input.content;
  }

  const { media, text: existingCaption } = parseMediaMessage(input.content);

  if (!media || media.kind !== "audio") {
    return input.content;
  }

  const storagePath = resolveMediaStoragePath(media);

  if (!storagePath) {
    await scheduleDeferredVoiceAutoReply(input, existingCaption);
    return input.content;
  }

  const buffer = await downloadChatAttachmentBuffer(storagePath);

  if (!buffer) {
    console.error("[inbound-voice] attachment download failed", input.message.id);
    await scheduleDeferredVoiceAutoReply(input, existingCaption);
    return input.content;
  }

  const transcript = await transcribeAudioBuffer({
    buffer,
    fileName: media.fileName,
    mimeType: media.mimeType,
  });

  const transcriptText = transcript?.trim() ?? "";
  let finalContent = input.content;

  if (transcriptText) {
    finalContent = encodeMediaMessage(media, transcriptText);
    await updateChannelMessageContent(input.admin, {
      messageId: input.message.id,
      content: finalContent,
    });
  }

  await scheduleDeferredVoiceAutoReply(
    input,
    transcriptText || existingCaption,
  );

  return finalContent;
}

async function scheduleDeferredVoiceAutoReply(
  input: {
    admin: SupabaseClient<Database>;
    businessId: string;
    message: VoiceMessageRow;
  },
  clientMessage: string,
): Promise<void> {
  const trimmed = clientMessage.trim();

  if (!trimmed) {
    console.info("[inbound-voice] no transcript for voice message", input.message.id);
    return;
  }

  await scheduleInboundMessageProcessing({
    admin: input.admin,
    businessId: input.businessId,
    channel: input.message.channel,
    conversationId: input.message.conversation_id,
    clientMessage: trimmed,
  });
}
