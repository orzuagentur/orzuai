import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import { MAX_CHAT_ATTACHMENT_BYTES } from "@/features/chats/chat-attachments";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations";
import { hasResendEnv, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  getChatAttachmentSignedUrl,
  uploadChatAttachmentFile,
} from "@/services/chat-attachment-storage.service";
import {
  createOutboundMessageDelivery,
  insertChannelMessage,
} from "@/services/messaging.service";
import { processPendingMessageDeliveries } from "@/services/message-delivery.service";
import { createReadyMessageAttachment } from "@/services/message-attachment.service";
import type { SendChatMessageResult } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { mapChatMessage, resolveContactFromRow } from "@/utils/chat";
import {
  buildMediaPayloadFromUpload,
  encodeMediaMessage,
  resolveMediaKind,
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

  if (channel === "email") {
    return hasResendEnv();
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

  if (channel === "email") {
    return CHAT_MESSAGES.contactEmailUnavailable;
  }

  if (channel === "facebook_messenger") {
    return CHAT_MESSAGES.genericError;
  }

  return CHAT_MESSAGES.whatsappNotConnected;
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

  const mimeType = file.type || "application/octet-stream";
  const mediaKind = resolveMediaKind(mimeType);

  const stored = await uploadChatAttachmentFile(
    businessId,
    conversationId,
    file,
  );

  if (!stored?.url) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.mediaSendFailed,
      },
    };
  }

  const mediaPayload = buildMediaPayloadFromUpload({
    kind: mediaKind,
    fileName: file.name,
    mimeType,
    path: stored.path,
    sizeBytes: stored.sizeBytes,
    legacyUrl: stored.url,
    thumbPath: stored.thumbnailPath,
    thumbWidth: stored.thumbWidth,
    thumbHeight: stored.thumbHeight,
  });

  const content = encodeMediaMessage(mediaPayload, caption);

  const insertedMessage = await insertChannelMessage(supabase, {
    conversationId,
    channel: conversation.channel,
    senderType: "user",
    content,
  });

  await createReadyMessageAttachment(supabase, {
    messageId: insertedMessage.id,
    businessId,
    media: mediaPayload,
  });

  await createOutboundMessageDelivery(supabase, {
    messageId: insertedMessage.id,
    businessId,
    channel: conversation.channel,
  });

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
  ]);

  void processPendingMessageDeliveries().catch((error) => {
    console.error("[chat-media] outbound delivery worker failed", error);
  });

  revalidateChatPaths(conversation.channel);

  const mediaSignedUrl = await getChatAttachmentSignedUrl(stored.path);

  return {
    success: true,
    data: {
      message: mapChatMessage(insertedMessage),
      mediaSignedUrl: mediaSignedUrl ?? undefined,
    },
  };
}
