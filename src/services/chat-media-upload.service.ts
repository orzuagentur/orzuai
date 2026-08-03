import "server-only";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  CHAT_ATTACHMENTS_BUCKET,
  MAX_CHAT_ATTACHMENT_BYTES,
} from "@/features/chats/chat-attachments";
import { hasSupabaseEnv } from "@/lib/env";
import {
  createMediaUploadUrl,
  mediaObjectExists,
  newMediaObjectRef,
} from "@/lib/storage/media-storage";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleBusiness } from "@/services/business-access.service";
import { requireUser } from "@/services/auth.service";
import { scheduleOutboundAttachmentThumbnail } from "@/services/chat-attachment-thumbnail.service";
import {
  createOutboundMessageDelivery,
  insertChannelMessage,
} from "@/services/messaging.service";
import { scheduleOutboundMessageDelivery } from "@/services/message-delivery.service";
import { isGmailConnected } from "@/services/gmail-integration.service";
import { isOutlookConnected } from "@/services/outlook-integration.service";
import { buildPendingOutboundChatMessage } from "@/services/outbound-message.service";
import { createReadyMessageAttachment } from "@/services/message-attachment.service";
import { normalizeStoredVoiceNoteAsset } from "@/services/voice-note-transcode.service";
import type { ChatActionError, SendChatMessageResult } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { resolveContactFromRow } from "@/utils/chat";
import {
  buildChatAttachmentStoragePath,
  buildThumbnailStoragePath,
  isValidChatAttachmentStoragePath,
} from "@/utils/chat-attachment-path";
import { isR2StorageRef } from "@/utils/storage-ref";
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

export type ChatMediaUploadProvider = "r2" | "supabase";

export type PrepareChatMediaUploadResult =
  | {
      success: true;
      data: {
        /** Provider-aware storage ref (R2 `r2::` prefix or legacy Supabase path). */
        path: string;
        /** Supabase bucket (used only for the legacy authenticated client upload). */
        bucket: string;
        provider: ChatMediaUploadProvider;
        /** Presigned PUT URL for direct R2 upload (present only for `provider: "r2"`). */
        uploadUrl?: string;
        /** Presigned PUT URL for the R2 thumbnail (images only). */
        thumbUploadUrl?: string;
        /** Exact Content-Type the client must send with the presigned PUT. */
        uploadContentType?: string;
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.whatsapp_status === "connected";
  }

  if (channel === "whatsapp_web") {
    const { data } = await supabase
      .from("whatsapp_web_connections")
      .select("status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.status === "connected";
  }

  if (channel === "telegram") {
    const { data } = await supabase
      .from("telegram_connections")
      .select("telegram_status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.telegram_status === "connected";
  }

  if (channel === "telegram_user") {
    const { data } = await supabase
      .from("telegram_user_connections")
      .select("status")
      .eq("business_id", businessId)
      .maybeSingle();

    return data?.status === "connected";
  }

  if (channel === "instagram") {
    return false;
  }

  if (channel === "website_forms") {
    const { data } = await supabase
      .from("website_form_connections")
      .select("connection_status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.connection_status === "connected";
  }

  if (channel === "email") {
    return isGmailConnected(businessId);
  }

  if (channel === "outlook") {
    return isOutlookConnected(businessId);
  }

  return false;
}

function channelNotConnectedMessage(channel: MessagingChannel): string {
  if (channel === "instagram") {
    return CHAT_MESSAGES.instagramNotConnected;
  }

  if (channel === "telegram" || channel === "telegram_user") {
    return CHAT_MESSAGES.telegramNotConnected;
  }

  if (channel === "website_forms") {
    return CHAT_MESSAGES.websiteFormsNotConnected;
  }

  if (channel === "email") {
    return CHAT_MESSAGES.emailNotConnected;
  }

  if (channel === "outlook") {
    return CHAT_MESSAGES.outlookNotConnected;
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
  return mediaObjectExists(path);
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

  const logicalKey = buildChatAttachmentStoragePath(
    resolved.context.businessId,
    resolved.context.conversationId,
    fileName,
  );
  const ref = newMediaObjectRef(logicalKey);
  const uploadContentType = input.mimeType?.trim() || "application/octet-stream";

  if (!isR2StorageRef(ref)) {
    // Legacy path: browser uploads through the authenticated Supabase client.
    return {
      success: true,
      data: {
        path: ref,
        bucket: CHAT_ATTACHMENTS_BUCKET,
        provider: "supabase",
      },
    };
  }

  // R2 path: browser uploads directly to R2 via short-lived presigned PUT URLs.
  const uploadUrl = await createMediaUploadUrl({
    ref,
    contentType: uploadContentType,
  });

  if (!uploadUrl) {
    return { success: false, error: missingConfigActionError() };
  }

  const thumbUploadUrl = uploadContentType.startsWith("image/")
    ? await createMediaUploadUrl({
        ref: buildThumbnailStoragePath(ref),
        contentType: "image/jpeg",
      })
    : null;

  return {
    success: true,
    data: {
      path: ref,
      bucket: CHAT_ATTACHMENTS_BUCKET,
      provider: "r2",
      uploadUrl,
      thumbUploadUrl: thumbUploadUrl ?? undefined,
      uploadContentType,
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

  let normalizedPath = path;
  let normalizedFileName = fileName;
  let normalizedMimeType = mimeType;
  let normalizedSizeBytes = input.sizeBytes;

  try {
    const normalizedVoice = await normalizeStoredVoiceNoteAsset({
      path,
      fileName,
      mimeType,
      sizeBytes: input.sizeBytes,
    });

    normalizedPath = normalizedVoice.path;
    normalizedFileName = normalizedVoice.fileName;
    normalizedMimeType = normalizedVoice.mimeType;
    normalizedSizeBytes = normalizedVoice.sizeBytes;
  } catch (error) {
    console.error("[chat-media-upload] voice note transcode failed", error);

    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: CHAT_MESSAGES.mediaSendFailed,
      },
    };
  }

  const mediaKind = resolveMediaKind(normalizedMimeType);
  const mediaPayload = buildMediaPayloadFromUpload({
    kind: mediaKind,
    fileName: normalizedFileName,
    mimeType: normalizedMimeType,
    path: normalizedPath,
    sizeBytes: normalizedSizeBytes,
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

  scheduleOutboundMessageDelivery(insertedMessage.id);

  return {
    success: true,
    data: {
      message: buildPendingOutboundChatMessage(insertedMessage),
    },
  };
}
