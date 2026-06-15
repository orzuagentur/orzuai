import "server-only";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  CHAT_ATTACHMENTS_BUCKET,
  MAX_CHAT_ATTACHMENT_BYTES,
} from "@/features/chats/chat-attachments";
import { hasResendEnv, hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import { scheduleOutboundAttachmentThumbnail } from "@/services/chat-attachment-thumbnail.service";
import {
  createOutboundMessageDelivery,
  insertChannelMessage,
} from "@/services/messaging.service";
import { deliverOutboundMessageNow } from "@/services/message-delivery.service";
import { buildOutboundChatMessage } from "@/services/outbound-message.service";
import { createReadyMessageAttachment } from "@/services/message-attachment.service";
import type { ChatActionError, SendChatMessageResult } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { resolveContactFromRow } from "@/utils/chat";
import {
  buildChatAttachmentStoragePath,
  buildThumbnailStoragePath,
  isValidChatAttachmentStoragePath,
} from "@/utils/chat-attachment-path";
import {
  buildMediaPayloadFromUpload,
  encodeMediaMessage,
  resolveMediaKind,
} from "@/utils/chat-media";

type MediaSendContext = {
  businessId: string;
  conversationId: string;
  channel: MessagingChannel;
  contactId: string | null;
};

export type PrepareChatMediaUploadResult =
  | {
      success: true;
      data: {
        path: string;
        bucket: string;
      };
    }
  | {
      success: false;
      error: ChatActionError;
    };

export type CompleteChatMediaUploadInput = {
  conversationId: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
  thumbPath?: string;
  thumbWidth?: number;
  thumbHeight?: number;
};

function missingConfigActionError(): ChatActionError {
  return {
    code: "MISSING_CONFIG",
    message: CHAT_MESSAGES.missingConfig,
  };
}

function missingConfigError(): SendChatMessageResult {
  return {
    success: false,
    error: missingConfigActionError(),
  };
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getAccessibleBusiness(user.id);
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

async function resolveMediaSendContext(
  conversationId: string,
): Promise<
  | { success: true; context: MediaSendContext }
  | { success: false; error: ChatActionError }
> {
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

  return {
    success: true,
    context: {
      businessId,
      conversationId: conversation.id,
      channel: conversation.channel,
      contactId: contact.id ?? null,
    },
  };
}

async function storageObjectExists(path: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 60);

  return !error && Boolean(data?.signedUrl);
}

export async function prepareChatMediaUpload(input: {
  conversationId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<PrepareChatMediaUploadResult> {
  if (!hasSupabaseEnv()) {
    return { success: false, error: missingConfigActionError() };
  }

  const conversationId = input.conversationId?.trim();
  const fileName = input.fileName?.trim();

  if (!conversationId || !fileName || input.sizeBytes <= 0) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaInvalidFile,
      },
    };
  }

  if (input.sizeBytes > MAX_CHAT_ATTACHMENT_BYTES) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaFileTooLarge,
      },
    };
  }

  const resolved = await resolveMediaSendContext(conversationId);

  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const path = buildChatAttachmentStoragePath(
    resolved.context.businessId,
    resolved.context.conversationId,
    fileName,
  );

  return {
    success: true,
    data: {
      path,
      bucket: CHAT_ATTACHMENTS_BUCKET,
    },
  };
}

export async function completeChatMediaUpload(
  input: CompleteChatMediaUploadInput,
): Promise<SendChatMessageResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const conversationId = input.conversationId?.trim();
  const path = input.path?.trim();
  const fileName = input.fileName?.trim();
  const mimeType = input.mimeType?.trim() || "application/octet-stream";

  if (!conversationId || !path || !fileName || input.sizeBytes <= 0) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaInvalidFile,
      },
    };
  }

  if (input.sizeBytes > MAX_CHAT_ATTACHMENT_BYTES) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaFileTooLarge,
      },
    };
  }

  const resolved = await resolveMediaSendContext(conversationId);

  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { businessId, channel, contactId } = resolved.context;

  if (!isValidChatAttachmentStoragePath(path, businessId, conversationId)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaInvalidFile,
      },
    };
  }

  if (!(await storageObjectExists(path))) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.mediaSendFailed,
      },
    };
  }

  const thumbPath = input.thumbPath?.trim();
  const hasClientThumbnail =
    Boolean(thumbPath) &&
    thumbPath === buildThumbnailStoragePath(path) &&
    typeof input.thumbWidth === "number" &&
    typeof input.thumbHeight === "number" &&
    input.thumbWidth > 0 &&
    input.thumbHeight > 0;

  if (thumbPath && !hasClientThumbnail) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: CHAT_MESSAGES.mediaInvalidFile,
      },
    };
  }

  if (hasClientThumbnail && thumbPath && !(await storageObjectExists(thumbPath))) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.mediaSendFailed,
      },
    };
  }

  const mediaKind = resolveMediaKind(mimeType);
  const mediaPayload = buildMediaPayloadFromUpload({
    kind: mediaKind,
    fileName,
    mimeType,
    path,
    sizeBytes: input.sizeBytes,
    thumbPath: hasClientThumbnail ? thumbPath : undefined,
    thumbWidth: hasClientThumbnail ? input.thumbWidth : undefined,
    thumbHeight: hasClientThumbnail ? input.thumbHeight : undefined,
  });

  const content = encodeMediaMessage(mediaPayload, input.caption?.trim() || "");
  const supabase = await createClient();

  const insertedMessage = await insertChannelMessage(supabase, {
    conversationId,
    channel,
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
    channel,
  });

  const now = new Date().toISOString();
  const contactUpdates = contactId
    ? [
        supabase
          .from("contacts")
          .update({ last_message_at: now })
          .eq("id", contactId),
      ]
    : [];

  await Promise.all([
    supabase
      .from("conversations")
      .update({ updated_at: now })
      .eq("id", conversationId),
    ...contactUpdates,
  ]);

  if (!hasClientThumbnail) {
    scheduleOutboundAttachmentThumbnail({
      messageId: insertedMessage.id,
      businessId,
      storagePath: path,
      mimeType,
    });
  }

  await deliverOutboundMessageNow(insertedMessage.id);

  const admin = createAdminClient();
  const message = await buildOutboundChatMessage(admin, insertedMessage);

  return {
    success: true,
    data: {
      message,
    },
  };
}
