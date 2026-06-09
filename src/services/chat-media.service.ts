import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { MAX_CHAT_ATTACHMENT_BYTES } from "@/features/chats/chat-attachments";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations";
import { sendInstagramMediaMessage } from "@/lib/instagram/client";
import { sendTelegramMediaMessage } from "@/lib/telegram/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import {
  sendWhatsAppMediaMessage,
  uploadWhatsAppMedia,
} from "@/lib/whatsapp/client";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  getChatAttachmentSignedUrl,
  uploadChatAttachmentFile,
} from "@/services/chat-attachment-storage.service";
import { incrementMessagingAnalytics, insertChannelMessage } from "@/services/messaging.service";
import type { SendChatMessageResult } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { mapChatMessage, resolveContactFromRow } from "@/utils/chat";
import {
  buildMediaPayloadFromUpload,
  encodeMediaMessage,
  resolveMediaKind,
  type ChatMediaKind,
} from "@/utils/chat-media";

type SendChatMediaInput = {
  conversationId: string;
  file: File;
  caption?: string;
};

function missingConfigError(): SendChatMessageResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: CHAT_MESSAGES.missingConfig,
    },
  };
}

function revalidateChatPaths(channel?: MessagingChannel): void {
  revalidatePath(DASHBOARD_ROUTES.chats);

  if (channel) {
    revalidatePath(`${DASHBOARD_ROUTES.chats}/${channel}`);
  }

  for (const ch of MESSAGING_INTEGRATION_CHANNELS) {
    revalidatePath(`${DASHBOARD_ROUTES.chats}/${ch}`);
  }

  revalidatePath(APP_ROUTES.dashboard);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

async function isChannelConnected(
  businessId: string,
  channel: MessagingChannel,
): Promise<boolean> {
  const supabase = await createClient();

  if (channel === "whatsapp") {
    const { data } = await supabase
      .from("whatsapp_connections")
      .select("whatsapp_status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.whatsapp_status === "connected";
  }

  if (channel === "telegram") {
    const { data } = await supabase
      .from("telegram_connections")
      .select("telegram_status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.telegram_status === "connected";
  }

  if (channel === "instagram") {
    const { data } = await supabase
      .from("instagram_connections")
      .select("instagram_status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.instagram_status === "connected";
  }

  if (channel === "website_forms") {
    const { data } = await supabase
      .from("website_form_connections")
      .select("connection_status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.connection_status === "connected";
  }

  return false;
}

function channelNotConnectedMessage(channel: MessagingChannel): string {
  if (channel === "instagram") {
    return CHAT_MESSAGES.instagramNotConnected;
  }

  if (channel === "telegram") {
    return CHAT_MESSAGES.telegramNotConnected;
  }

  if (channel === "website_forms") {
    return CHAT_MESSAGES.websiteFormsNotConnected;
  }

  return CHAT_MESSAGES.whatsappNotConnected;
}

function resolveRecipientId(
  channel: MessagingChannel,
  phoneNumber: string,
): string | null {
  if (channel === "whatsapp") {
    return phoneNumber.replace(/^\+/, "");
  }

  if (channel === "telegram") {
    return phoneNumber.replace(/^tg:/, "") || null;
  }

  if (channel === "instagram") {
    return phoneNumber.replace(/^ig:/, "") || null;
  }

  return null;
}

async function sendMediaToChannel(input: {
  channel: MessagingChannel;
  businessId: string;
  recipientId: string;
  file: File;
  mimeType: string;
  mediaKind: ChatMediaKind;
  caption: string;
  publicUrl: string;
  storagePath: string;
}): Promise<{ success: true } | { success: false; message: string }> {
  const supabase = await createClient();

  if (input.channel === "website_forms") {
    return { success: true };
  }

  if (input.channel === "whatsapp") {
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("meta_phone_number_id, meta_access_token")
      .eq("business_id", input.businessId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

    if (!connection?.meta_phone_number_id || !connection.meta_access_token) {
      return { success: false, message: CHAT_MESSAGES.whatsappNotConnected };
    }

    const uploadResult = await uploadWhatsAppMedia(
      connection.meta_phone_number_id,
      connection.meta_access_token,
      input.file,
      input.mimeType,
      input.file.name,
    );

    if (!uploadResult.success) {
      return { success: false, message: uploadResult.message };
    }

    const sendResult = await sendWhatsAppMediaMessage(
      connection.meta_phone_number_id,
      connection.meta_access_token,
      input.recipientId,
      input.mediaKind,
      uploadResult.mediaId,
      {
        caption: input.caption || undefined,
        filename: input.file.name,
      },
    );

    if (!sendResult.success) {
      return { success: false, message: sendResult.message };
    }

    return { success: true };
  }

  if (input.channel === "telegram") {
    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("bot_token")
      .eq("business_id", input.businessId)
      .eq("telegram_status", "connected")
      .maybeSingle();

    if (!connection?.bot_token) {
      return { success: false, message: CHAT_MESSAGES.telegramNotConnected };
    }

    const sendResult = await sendTelegramMediaMessage(
      connection.bot_token,
      input.recipientId,
      input.file,
      input.file.name,
      input.mimeType,
      { caption: input.caption || undefined },
    );

    if (!sendResult.success) {
      return { success: false, message: sendResult.message };
    }

    return { success: true };
  }

  if (input.channel === "instagram") {
    const { data: connection } = await supabase
      .from("instagram_connections")
      .select("meta_page_id, meta_access_token")
      .eq("business_id", input.businessId)
      .eq("instagram_status", "connected")
      .maybeSingle();

    if (!connection?.meta_page_id || !connection.meta_access_token) {
      return { success: false, message: CHAT_MESSAGES.instagramNotConnected };
    }

    const instagramMediaUrl =
      input.publicUrl ||
      (await getChatAttachmentSignedUrl(input.storagePath, 3600));

    if (!instagramMediaUrl) {
      return { success: false, message: CHAT_MESSAGES.mediaSendFailed };
    }

    const sendResult = await sendInstagramMediaMessage(
      connection.meta_page_id,
      connection.meta_access_token,
      input.recipientId,
      input.mediaKind,
      instagramMediaUrl,
    );

    if (!sendResult.success) {
      return { success: false, message: sendResult.message };
    }

    return { success: true };
  }

  return {
    success: false,
    message: CHAT_MESSAGES.mediaNotSupportedForChannel,
  };
}

export async function sendChatMedia(
  input: SendChatMediaInput,
): Promise<SendChatMessageResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const conversationId = input.conversationId?.trim();
  const file = input.file;
  const caption = input.caption?.trim() || "";

  if (!conversationId || !file || file.size === 0) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaInvalidFile,
      },
    };
  }

  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaFileTooLarge,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: CHAT_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, channel, contact:contacts(id, phone_number)")
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!conversation) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  const connected = await isChannelConnected(businessId, conversation.channel);

  if (!connected) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: channelNotConnectedMessage(conversation.channel),
      },
    };
  }

  const contact = resolveContactFromRow(conversation.contact);

  if (!contact) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  const recipientId = resolveRecipientId(
    conversation.channel,
    contact.phone_number,
  );

  if (!recipientId && conversation.channel !== "website_forms") {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: CHAT_MESSAGES.genericError,
      },
    };
  }

  const mimeType = file.type || "application/octet-stream";
  const mediaKind = resolveMediaKind(mimeType);
  const stored = await uploadChatAttachmentFile(businessId, conversationId, file);

  if (!stored?.url) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.mediaSendFailed,
      },
    };
  }

  if (recipientId) {
    const instagramSignedUrl = await getChatAttachmentSignedUrl(
      stored.path,
      3600,
    );

    const sendResult = await sendMediaToChannel({
      channel: conversation.channel,
      businessId,
      recipientId,
      file,
      mimeType,
      mediaKind,
      caption,
      publicUrl: instagramSignedUrl ?? stored.url,
      storagePath: stored.path,
    });

    if (!sendResult.success) {
      return {
        success: false,
        error: {
          code: "SEND_FAILED",
          message: sendResult.message,
        },
      };
    }
  }

  const content = encodeMediaMessage(
    buildMediaPayloadFromUpload({
      kind: mediaKind,
      fileName: file.name,
      mimeType,
      path: stored.path,
      sizeBytes: stored.sizeBytes,
      legacyUrl: stored.url,
    }),
    caption,
  );

  await insertChannelMessage(supabase, {
    conversationId,
    channel: conversation.channel,
    senderType: "user",
    content,
  });

  const { data: insertedMessage } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, channel, sender_type, content, ai_generated, created_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!insertedMessage) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.sendFailed,
      },
    };
  }

  const now = new Date().toISOString();
  const contactUpdates = contact.id
    ? [
        supabase
          .from("contacts")
          .update({ last_message_at: now })
          .eq("id", contact.id),
      ]
    : [];

  await Promise.all([
    supabase
      .from("conversations")
      .update({ updated_at: now })
      .eq("id", conversationId),
    ...contactUpdates,
    incrementMessagingAnalytics(createAdminClient(), businessId, conversation.channel, {
      totalMessages: 1,
    }),
  ]);

  revalidateChatPaths(conversation.channel);

  return {
    success: true,
    data: {
      message: mapChatMessage(insertedMessage),
    },
  };
}
