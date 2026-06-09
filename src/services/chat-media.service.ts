import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { CHAT_MESSAGES } from "@/features/chats/constants";
import {
  CHAT_ATTACHMENTS_BUCKET,
  MAX_CHAT_ATTACHMENT_BYTES,
} from "@/features/chats/chat-attachments";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import {
  sendWhatsAppMediaMessage,
  uploadWhatsAppMedia,
} from "@/lib/whatsapp/client";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import { incrementMessagingAnalytics, insertChannelMessage } from "@/services/messaging.service";
import type { SendChatMessageResult } from "@/types/chat.types";
import type { MessagingChannel } from "@/types/database.types";
import { mapChatMessage, resolveContactFromRow } from "@/utils/chat";
import {
  encodeMediaMessage,
  resolveWhatsAppMediaKind,
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

function mediaNotSupported(channel: MessagingChannel): SendChatMessageResult {
  return {
    success: false,
    error: {
      code: "SEND_FAILED",
      message:
        channel === "whatsapp"
          ? CHAT_MESSAGES.mediaSendFailed
          : CHAT_MESSAGES.mediaNotSupportedForChannel,
    },
  };
}

async function uploadChatAttachment(
  businessId: string,
  conversationId: string,
  file: File,
): Promise<{ url: string } | null> {
  const admin = createAdminClient();
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const path = `${businessId}/${conversationId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    return null;
  }

  const { data } = admin.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(path);

  return data.publicUrl ? { url: data.publicUrl } : null;
}

async function isWhatsAppConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("whatsapp_status")
    .eq("business_id", businessId)
    .maybeSingle();

  return data?.whatsapp_status === "connected";
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

  if (conversation.channel !== "whatsapp") {
    return mediaNotSupported(conversation.channel);
  }

  const connected = await isWhatsAppConnected(businessId);

  if (!connected) {
    return {
      success: false,
      error: {
        code: "WHATSAPP_NOT_CONNECTED",
        message: CHAT_MESSAGES.whatsappNotConnected,
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

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("meta_phone_number_id, meta_access_token")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  if (!connection?.meta_phone_number_id || !connection.meta_access_token) {
    return {
      success: false,
      error: {
        code: "WHATSAPP_NOT_CONNECTED",
        message: CHAT_MESSAGES.whatsappNotConnected,
      },
    };
  }

  const mimeType = file.type || "application/octet-stream";
  const mediaKind: ChatMediaKind = resolveWhatsAppMediaKind(mimeType);
  const uploadResult = await uploadWhatsAppMedia(
    connection.meta_phone_number_id,
    connection.meta_access_token,
    file,
    mimeType,
    file.name,
  );

  if (!uploadResult.success) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: uploadResult.message,
      },
    };
  }

  const sendResult = await sendWhatsAppMediaMessage(
    connection.meta_phone_number_id,
    connection.meta_access_token,
    contact.phone_number.replace(/^\+/, ""),
    mediaKind,
    uploadResult.mediaId,
    {
      caption: caption || undefined,
      filename: file.name,
    },
  );

  if (!sendResult.success) {
    return {
      success: false,
      error: {
        code: "SEND_FAILED",
        message: sendResult.message,
      },
    };
  }

  const stored = await uploadChatAttachment(businessId, conversationId, file);
  const content = encodeMediaMessage(
    {
      kind: mediaKind,
      url: stored?.url ?? "",
      fileName: file.name,
      mimeType,
    },
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
