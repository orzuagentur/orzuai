import "server-only";

import {
  getChatAttachmentSignedUrl,
  uploadChatAttachmentBuffer,
} from "@/services/chat-attachment-storage.service";
import { deliverChannelMediaMessage } from "@/services/channels/deliver-media";
import { resolveChannelRecipient } from "@/services/channels/resolve-recipient";
import { synthesizeElevenLabsSpeech } from "@/services/elevenlabs.service";
import { markMessageAttachmentReady } from "@/services/message-attachment.service";
import { transcodeVoiceNoteToOggOpus } from "@/services/voice-note-transcode.service";
import { logAiUsage } from "@/services/ai-usage.service";
import type { Database, MessagingChannel } from "@/types/database.types";
import type { VoiceReplyMode } from "@/types/elevenlabs.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  encodeMediaMessage,
  parseMediaMessage,
  shouldDeferAutoReplyForInboundVoice,
} from "@/utils/chat-media";

type MessagingDbClient = SupabaseClient<Database>;

const VOICE_REPLY_CHANNELS = new Set<MessagingChannel>(["telegram", "whatsapp"]);

export type VoiceReplySettings = {
  enabled: boolean;
  voiceId: string | null;
  voiceReplyMode: VoiceReplyMode;
  language: string;
};

export async function loadVoiceReplySettings(
  admin: MessagingDbClient,
  businessId: string,
): Promise<VoiceReplySettings> {
  const { data } = await admin
    .from("ai_assistant_profile")
    .select(
      "voice_reply_enabled, elevenlabs_voice_id, voice_reply_mode, language",
    )
    .eq("business_id", businessId)
    .maybeSingle();

  return {
    enabled: data?.voice_reply_enabled ?? false,
    voiceId: data?.elevenlabs_voice_id?.trim() || null,
    voiceReplyMode:
      data?.voice_reply_mode === "always" ? "always" : "mirror",
    language: data?.language?.trim() || "English",
  };
}

async function wasLastClientMessageVoice(
  admin: MessagingDbClient,
  conversationId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .eq("sender_type", "client")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.content) {
    return false;
  }

  return shouldDeferAutoReplyForInboundVoice(data.content);
}

export async function shouldUseVoiceAutoReply(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
}): Promise<{ useVoice: boolean; voiceId: string | null }> {
  if (!VOICE_REPLY_CHANNELS.has(input.channel)) {
    return { useVoice: false, voiceId: null };
  }

  const settings = await loadVoiceReplySettings(input.admin, input.businessId);

  if (!settings.enabled || !settings.voiceId) {
    return { useVoice: false, voiceId: null };
  }

  if (settings.voiceReplyMode === "always") {
    return { useVoice: true, voiceId: settings.voiceId };
  }

  const mirrorVoice = await wasLastClientMessageVoice(
    input.admin,
    input.conversationId,
  );

  return {
    useVoice: mirrorVoice,
    voiceId: mirrorVoice ? settings.voiceId : null,
  };
}

function resolveLanguageCode(language: string): string | undefined {
  const normalized = language.trim().toLowerCase();

  if (normalized.startsWith("ru") || normalized === "russian" || normalized === "русский") {
    return "ru";
  }

  if (normalized.startsWith("uz") || normalized === "uzbek" || normalized.includes("o'zbek")) {
    return "uz";
  }

  if (normalized.startsWith("en") || normalized === "english") {
    return "en";
  }

  return undefined;
}

export async function sendChannelAutoReplyVoice(input: {
  admin: MessagingDbClient;
  businessId: string;
  channel: MessagingChannel;
  conversationId: string;
  text: string;
  voiceId: string;
  language: string;
}): Promise<{ success: boolean; content?: string; error?: string }> {
  const recipientId = await resolveChannelRecipient(input.admin, {
    businessId: input.businessId,
    conversationId: input.conversationId,
    channel: input.channel,
  });

  if (!recipientId) {
    return { success: false, error: "Could not resolve channel recipient." };
  }

  const speech = await synthesizeElevenLabsSpeech({
    text: input.text,
    voiceId: input.voiceId,
    languageCode: resolveLanguageCode(input.language),
  });

  if (!speech.success) {
    return { success: false, error: speech.message };
  }

  await logAiUsage({
    businessId: input.businessId,
    conversationId: input.conversationId,
    provider: "elevenlabs",
    model: "eleven_multilingual_v2",
    inputTokens: input.text.length,
    outputTokens: 0,
    billingSource: "platform",
    callType: "voice_tts",
  });

  let audioBuffer = speech.buffer;
  let mimeType = speech.mimeType;
  let fileName = `voice-ai-${Date.now()}.mp3`;

  try {
    audioBuffer = await transcodeVoiceNoteToOggOpus(speech.buffer, speech.mimeType);
    mimeType = "audio/ogg";
    fileName = `voice-ai-${Date.now()}.ogg`;
  } catch (error) {
    console.warn("[ai-voice-reply] ogg transcode failed, sending mp3", error);
  }

  const uploaded = await uploadChatAttachmentBuffer(
    input.businessId,
    input.conversationId,
    audioBuffer,
    {
      fileName,
      mimeType,
    },
  );

  if (!uploaded) {
    return { success: false, error: "Unable to store generated voice message." };
  }

  const media = {
    kind: "audio" as const,
    fileName,
    mimeType,
    path: uploaded.path,
    sizeBytes: uploaded.sizeBytes,
  };
  const content = encodeMediaMessage(media);
  const mediaUrl = await getChatAttachmentSignedUrl(uploaded.path);

  if (!mediaUrl) {
    return { success: false, error: "Unable to resolve voice media URL." };
  }

  const sendResult = await deliverChannelMediaMessage({
    admin: input.admin,
    businessId: input.businessId,
    channel: input.channel,
    recipientId,
    content,
    mediaUrl,
    fileName,
    mimeType,
    mediaKind: "audio",
  });

  if (!sendResult.success) {
    return { success: false, error: sendResult.error };
  }

  return { success: true, content };
}

export async function attachVoiceReplyMetadata(
  admin: MessagingDbClient,
  input: {
    messageId: string;
    businessId: string;
    content: string;
  },
): Promise<void> {
  const { media } = parseMediaMessage(input.content);

  if (!media) {
    return;
  }

  await markMessageAttachmentReady(admin, {
    messageId: input.messageId,
    media,
  });
}
