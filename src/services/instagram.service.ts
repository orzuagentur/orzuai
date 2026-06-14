import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { ENV_KEYS } from "@/constants/env-keys";
import { INSTAGRAM_MESSAGES } from "@/features/instagram/constants";
import {
  getInstagramEmbeddedSignupConfigId,
  getMetaAppId,
  hasInstagramEnv,
  hasSupabaseEnv,
} from "@/lib/env";
import {
  exchangeInstagramSignupCode,
  resolveInstagramPageDetails,
  sendInstagramTextMessage,
  subscribeInstagramPage,
} from "@/lib/instagram/client";
import { isEmbeddedSignupFinishEvent } from "@/lib/whatsapp/embedded-signup";
import { getWhatsAppApiVersion } from "@/lib/whatsapp/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import {
  notifyClientTyping,
  resolveConversationIdForChannelSender,
} from "@/services/conversation-typing.service";
import { scheduleContactAvatarSync } from "@/services/contact-avatar-sync.service";
import { syncContactChannelIdentity } from "@/services/contact-channel-identity.service";
import { createPendingMessageAttachment } from "@/services/message-attachment.service";
import { scheduleNewLeadPush } from "@/services/push-notifications.service";
import {
  findContactForChannel,
  findMessageByExternalId,
  incrementMessagingAnalytics,
  insertChannelMessage,
  createOutboundMessageDelivery,
  recordMessageDeliveryFailure,
  recordMessageDeliverySuccess,
  scheduleChannelAutoReply,
  resolveInboundConversation,
} from "@/services/messaging.service";
import type { InsertedChannelMessageRow } from "@/services/messaging.service";
import type { InstagramConnection } from "@/types/database.types";
import type {
  CompleteInstagramEmbeddedSignupInput,
  CompleteInstagramEmbeddedSignupResult,
  ConnectManualInstagramInput,
  ConnectManualInstagramResult,
  InstagramConnectConfig,
  InstagramConnectionData,
  InstagramEmbeddedSignupConfig,
  InstagramWebhookPayload,
} from "@/types/instagram.types";
import {
  completeInstagramEmbeddedSignupSchema,
  connectManualInstagramSchema,
} from "@/types/instagram.types";
import { scheduleInboundMediaHydration } from "@/services/inbound-media-hydration.service";
import {
  buildInboundMediaFallbackContent,
  getMessagePlainText,
} from "@/utils/chat-media";
import { mapInstagramConnection } from "@/utils/instagram";
import {
  parseInstagramWebhookPayload,
  parseInstagramWebhookTypingEvents,
} from "@/utils/instagram-webhook";
import type { InstagramWebhookMessage } from "@/types/instagram.types";

function missingConfigError(): CompleteInstagramEmbeddedSignupResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: INSTAGRAM_MESSAGES.genericError,
    },
  };
}

function revalidateInstagramPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/instagram`);
  revalidatePath(DASHBOARD_ROUTES.marketplace);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function getInstagramConnection(
  businessId: string,
): Promise<InstagramConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("instagram_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapInstagramConnection(data) : null;
}

export function getInstagramWebhookUrl(): string {
  const appUrl = process.env[ENV_KEYS.NEXT_PUBLIC_APP_URL]?.trim() ?? "";

  if (!appUrl) {
    return "";
  }

  return `${appUrl.replace(/\/$/, "")}/api/webhooks/instagram`;
}

export function getInstagramConnectConfig(): InstagramConnectConfig {
  const webhookUrl = getInstagramWebhookUrl();

  return {
    isConfigured: hasSupabaseEnv() && webhookUrl.startsWith("https://"),
    webhookUrl,
  };
}

export async function disconnectInstagram(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: INSTAGRAM_MESSAGES.genericError };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: INSTAGRAM_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("instagram_connections")
    .update({
      instagram_status: "disconnected",
      instagram_username: "",
      meta_page_id: null,
      meta_ig_user_id: null,
      meta_access_token: null,
      meta_business_account_id: null,
      connected_at: null,
      last_synced_at: null,
    })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateInstagramPaths();
  return { success: true };
}

export async function getInstagramEmbeddedSignupConfig(): Promise<InstagramEmbeddedSignupConfig> {
  const appId = getMetaAppId();
  const configId = getInstagramEmbeddedSignupConfigId();

  return {
    appId: appId ?? "",
    configId: configId ?? "",
    graphApiVersion: getWhatsAppApiVersion(),
    isConfigured: hasInstagramEnv(),
  };
}

export async function completeInstagramEmbeddedSignup(
  input: CompleteInstagramEmbeddedSignupInput,
): Promise<CompleteInstagramEmbeddedSignupResult> {
  if (!hasSupabaseEnv() || !hasInstagramEnv()) {
    return missingConfigError();
  }

  const parsed = completeInstagramEmbeddedSignupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  if (!isEmbeddedSignupFinishEvent(parsed.data.finishEvent)) {
    return {
      success: false,
      error: {
        code: "SIGNUP_INCOMPLETE",
        message: INSTAGRAM_MESSAGES.signupIncomplete,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: INSTAGRAM_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingConnection } = await supabase
    .from("instagram_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("instagram_status", "connected")
    .maybeSingle();

  if (existingConnection) {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: INSTAGRAM_MESSAGES.alreadyConnected,
      },
    };
  }

  const tokenResult = await exchangeInstagramSignupCode(parsed.data.code);

  if (!tokenResult.success) {
    return {
      success: false,
      error: {
        code: "TOKEN_EXCHANGE_FAILED",
        message: tokenResult.message,
      },
    };
  }

  const pageDetails = await resolveInstagramPageDetails(
    parsed.data.pageId,
    tokenResult.accessToken,
    parsed.data.igUserId,
  );

  if (!pageDetails.success) {
    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: pageDetails.message,
      },
    };
  }

  const subscribeResult = await subscribeInstagramPage(
    pageDetails.details.pageId,
    tokenResult.accessToken,
  );

  if (!subscribeResult.success) {
    return {
      success: false,
      error: {
        code: "SUBSCRIBE_FAILED",
        message: subscribeResult.message,
      },
    };
  }

  const connectedAt = new Date().toISOString();
  const connectionPayload = {
    business_id: businessId,
    instagram_username: pageDetails.details.username || pageDetails.details.pageName,
    instagram_status: "connected" as const,
    meta_page_id: pageDetails.details.pageId,
    meta_ig_user_id: pageDetails.details.igUserId,
    meta_access_token: tokenResult.accessToken,
    meta_business_account_id: parsed.data.businessAccountId ?? null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: existingPending } = await supabase
    .from("instagram_connections")
    .select("id")
    .eq("business_id", businessId)
    .neq("instagram_status", "connected")
    .maybeSingle();

  const { data, error } = existingPending
    ? await supabase
        .from("instagram_connections")
        .update(connectionPayload)
        .eq("id", existingPending.id)
        .select("*")
        .single()
    : await supabase
        .from("instagram_connections")
        .insert(connectionPayload)
        .select("*")
        .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: error?.message || INSTAGRAM_MESSAGES.genericError,
      },
    };
  }

  revalidateInstagramPaths();

  return {
    success: true,
    data: {
      connection: mapInstagramConnection(data),
    },
  };
}

export async function connectManualInstagram(
  input: ConnectManualInstagramInput,
): Promise<ConnectManualInstagramResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = connectManualInstagramSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: INSTAGRAM_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingConnection } = await supabase
    .from("instagram_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("instagram_status", "connected")
    .maybeSingle();

  if (existingConnection) {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: INSTAGRAM_MESSAGES.alreadyConnected,
      },
    };
  }

  const accessToken = parsed.data.accessToken;

  const pageDetails = await resolveInstagramPageDetails(
    parsed.data.pageId,
    accessToken,
    parsed.data.igUserId,
  );

  if (!pageDetails.success) {
    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: pageDetails.message,
      },
    };
  }

  const subscribeResult = await subscribeInstagramPage(
    pageDetails.details.pageId,
    accessToken,
  );

  if (!subscribeResult.success) {
    return {
      success: false,
      error: {
        code: "SUBSCRIBE_FAILED",
        message: subscribeResult.message,
      },
    };
  }

  const connectedAt = new Date().toISOString();
  const connectionPayload = {
    business_id: businessId,
    instagram_username:
      pageDetails.details.username || pageDetails.details.pageName,
    instagram_status: "connected" as const,
    meta_page_id: pageDetails.details.pageId,
    meta_ig_user_id: pageDetails.details.igUserId,
    meta_access_token: accessToken,
    meta_business_account_id: parsed.data.businessAccountId ?? null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: existingPending } = await supabase
    .from("instagram_connections")
    .select("id")
    .eq("business_id", businessId)
    .neq("instagram_status", "connected")
    .maybeSingle();

  const { data, error } = existingPending
    ? await supabase
        .from("instagram_connections")
        .update(connectionPayload)
        .eq("id", existingPending.id)
        .select("*")
        .single()
    : await supabase
        .from("instagram_connections")
        .insert(connectionPayload)
        .select("*")
        .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: error?.message || INSTAGRAM_MESSAGES.genericError,
      },
    };
  }

  revalidateInstagramPaths();

  return {
    success: true,
    data: {
      connection: mapInstagramConnection(data),
    },
  };
}

async function ingestInstagramMessage(
  admin: ReturnType<typeof createAdminClient>,
  connection: InstagramConnection,
  message: InstagramWebhookMessage,
): Promise<void> {
  const businessId = connection.business_id;
  const identifier = `ig:${message.from}`;

  const existingContact = await findContactForChannel(
    admin,
    businessId,
    "instagram",
    identifier,
  );

  let contactId = existingContact?.id;
  let createdContact = false;

  if (!contactId) {
    const { data: createdContactRow } = await admin
      .from("contacts")
      .insert({
        business_id: businessId,
        channel: "instagram",
        name: message.contactName,
        phone_number: identifier,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    contactId = createdContactRow?.id;
    createdContact = Boolean(contactId);
  } else {
    await admin
      .from("contacts")
      .update({
        name: message.contactName,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", contactId);
  }

  if (!contactId) {
    return;
  }

  await syncContactChannelIdentity(admin, {
    businessId,
    contactId,
    channel: "instagram",
    identifier,
    displayLabel: message.contactName,
  });

  if (connection.meta_access_token) {
    void scheduleContactAvatarSync({
      admin,
      businessId,
      contactId,
      channel: "instagram",
      instagram: {
        accessToken: connection.meta_access_token,
        userId: message.from,
      },
    });
  }

  const conversationId = await resolveInboundConversation(
    admin,
    businessId,
    contactId,
    "instagram",
  );

  if (!conversationId) {
    return;
  }

  let content: string | null = null;

  if (message.kind === "text") {
    content = message.body;
  } else if (message.kind === "media") {
    content = buildInboundMediaFallbackContent(
      message.mediaKind,
      message.caption,
      message.fileName,
    );
  }

  if (!content) {
    return;
  }

  if (message.messageId) {
    const existing = await findMessageByExternalId(
      admin,
      "instagram",
      message.messageId,
    );

    if (existing) {
      return;
    }
  }

  const insertedMessage = await insertChannelMessage(admin, {
    conversationId,
    channel: "instagram",
    senderType: "client",
    content,
    externalMessageId: message.messageId,
  });

  if (message.kind === "media") {
    await createPendingMessageAttachment(admin, {
      messageId: insertedMessage.id,
      businessId,
      content,
    });
  }

  if (message.kind === "media") {
    scheduleInboundMediaHydration({
      admin,
      messageId: insertedMessage.id,
      businessId,
      conversationId,
      channel: "instagram",
      kind: message.mediaKind,
      fileName: message.fileName,
      mimeType: message.mimeType,
      caption: message.caption,
      sourceUrl: message.sourceUrl,
    });
  }

  await incrementMessagingAnalytics(admin, businessId, "instagram", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  if (createdContact) {
    scheduleNewLeadPush({
      businessId,
      contactId,
      contactName: message.contactName,
      channel: "instagram",
      preview: getMessagePlainText(content),
    });
  }

  await admin
    .from("instagram_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  scheduleChannelAutoReply({
    admin,
    businessId,
    channel: "instagram",
    conversationId,
    clientMessage: getMessagePlainText(content),
    sendReply: async (text) => {
      if (!connection.meta_page_id || !connection.meta_access_token) {
        return { success: false };
      }

      const sendResult = await sendInstagramTextMessage(
        connection.meta_page_id,
        connection.meta_access_token,
        message.from,
        text,
      );

      return { success: sendResult.success };
    },
  });
}

async function ingestInstagramTypingEvent(
  connection: InstagramConnection,
  event: ReturnType<typeof parseInstagramWebhookTypingEvents>[number],
): Promise<void> {
  const conversationId = await resolveConversationIdForChannelSender(
    connection.business_id,
    "instagram",
    `ig:${event.from}`,
  );

  if (!conversationId) {
    return;
  }

  await notifyClientTyping(conversationId, event.isTyping);
}

export async function processInstagramWebhook(
  payload: InstagramWebhookPayload,
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv()) {
    return { processed: 0 };
  }

  const messages = parseInstagramWebhookPayload(payload);
  const typingEvents = parseInstagramWebhookTypingEvents(payload);

  if (messages.length === 0 && typingEvents.length === 0) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  let processed = 0;

  for (const message of messages) {
    const { data: connection } = await admin
      .from("instagram_connections")
      .select("*")
      .eq("meta_page_id", message.pageId)
      .eq("instagram_status", "connected")
      .maybeSingle();

    if (!connection) {
      continue;
    }

    await ingestInstagramMessage(admin, connection, message);

    processed += 1;
  }

  for (const event of typingEvents) {
    const { data: connection } = await admin
      .from("instagram_connections")
      .select("*")
      .eq("meta_page_id", event.pageId)
      .eq("instagram_status", "connected")
      .maybeSingle();

    if (!connection) {
      continue;
    }

    await ingestInstagramTypingEvent(connection, event);
    processed += 1;
  }

  if (messages.length > 0) {
    revalidateInstagramPaths();
  }

  return { processed };
}

export async function sendInstagramChatMessage(
  businessId: string,
  conversationId: string,
  content: string,
): Promise<
  | { success: true; message: InsertedChannelMessageRow }
  | { success: false; message: string }
> {
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("conversations")
    .select("id, channel, contact:contacts(phone_number)")
    .eq("id", conversationId)
    .eq("business_id", businessId)
    .eq("channel", "instagram")
    .maybeSingle();

  if (!conversation) {
    return { success: false, message: "Conversation not found." };
  }

  const contactRow = Array.isArray(conversation.contact)
    ? conversation.contact[0]
    : conversation.contact;

  const recipientId = contactRow?.phone_number?.replace(/^ig:/, "");

  if (!recipientId) {
    return { success: false, message: "Invalid Instagram recipient." };
  }

  const { data: connection } = await admin
    .from("instagram_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("instagram_status", "connected")
    .maybeSingle();

  if (!connection?.meta_page_id || !connection.meta_access_token) {
    return { success: false, message: INSTAGRAM_MESSAGES.notConfigured };
  }

  const insertedMessage = await insertChannelMessage(admin, {
    conversationId,
    channel: "instagram",
    senderType: "user",
    content,
  });

  await createOutboundMessageDelivery(admin, {
    messageId: insertedMessage.id,
    businessId,
    channel: "instagram",
  });

  void deliverInstagramOutboundText({
    admin,
    messageId: insertedMessage.id,
    pageId: connection.meta_page_id,
    accessToken: connection.meta_access_token,
    recipientId,
    content,
    businessId,
  }).catch((error) => {
    console.error("[instagram] outbound delivery failed", error);
  });

  return { success: true, message: insertedMessage };
}

async function deliverInstagramOutboundText(input: {
  admin: ReturnType<typeof createAdminClient>;
  messageId: string;
  pageId: string;
  accessToken: string;
  recipientId: string;
  content: string;
  businessId: string;
}): Promise<void> {
  const sendResult = await sendInstagramTextMessage(
    input.pageId,
    input.accessToken,
    input.recipientId,
    input.content,
  );

  if (!sendResult.success) {
    await recordMessageDeliveryFailure(input.admin, {
      messageId: input.messageId,
      errorMessage: sendResult.message,
    });
    return;
  }

  await recordMessageDeliverySuccess(input.admin, {
    messageId: input.messageId,
    providerMessageId: sendResult.messageId,
  });

  await incrementMessagingAnalytics(input.admin, input.businessId, "instagram", {
    totalMessages: 1,
  });
}
