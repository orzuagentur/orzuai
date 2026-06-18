import "server-only";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { buildAppUrl } from "@/lib/app-url";
import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { TELEGRAM_MESSAGES } from "@/features/telegram/constants";
import { hasSupabaseEnv } from "@/lib/env";
import {
  deleteTelegramWebhook,
  getTelegramBotInfo,
  sendTelegramTextMessage,
  setTelegramWebhook,
} from "@/lib/telegram/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { scheduleOutboundMessageDelivery } from "@/services/message-delivery.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { scheduleContactAvatarSync } from "@/services/contact-avatar-sync.service";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import { createPendingMessageAttachment } from "@/services/message-attachment.service";
import { scheduleNewLeadPush } from "@/services/push-notifications.service";
import {
  createOutboundMessageDelivery,
  incrementMessagingAnalytics,
  insertChannelMessage,
  scheduleChannelAutoReply,
} from "@/services/messaging.service";
import type { InsertedChannelMessageRow } from "@/services/messaging.service";
import type { TelegramConnection } from "@/types/database.types";
import type {
  ConnectTelegramBotResult,
  TelegramConnectConfig,
  TelegramConnectInput,
  TelegramConnectionData,
  TelegramWebhookPayload,
} from "@/types/telegram.types";
import { telegramConnectSchema } from "@/types/telegram.types";
import { scheduleInboundMediaHydration } from "@/services/inbound-media-hydration.service";
import {
  buildInboundMediaFallbackContent,
  getMessagePlainText,
} from "@/utils/chat-media";
import { mapTelegramConnection } from "@/utils/telegram";
import { parseTelegramWebhookPayload } from "@/utils/telegram-webhook";
import type { TelegramInboundMessage } from "@/types/telegram.types";

function missingConfigError(): ConnectTelegramBotResult {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: TELEGRAM_MESSAGES.notConfigured,
    },
  };
}

function revalidateTelegramPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/telegram`);
  revalidatePath(DASHBOARD_ROUTES.marketplace);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function getTelegramWebhookUrl(): string {
  return buildAppUrl("/api/webhooks/telegram");
}

export async function disconnectTelegram(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: TELEGRAM_MESSAGES.genericError };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: TELEGRAM_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("telegram_connections")
    .select("id, bot_token")
    .eq("business_id", businessId)
    .maybeSingle();

  if (connection?.bot_token) {
    await deleteTelegramWebhook(connection.bot_token);
  }

  const { error } = await supabase
    .from("telegram_connections")
    .update({
      telegram_status: "disconnected",
      bot_username: "",
      telegram_bot_id: null,
      bot_token: null,
      webhook_secret: null,
      connected_at: null,
      last_synced_at: null,
    })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateTelegramPaths();
  return { success: true };
}

export async function getTelegramConnection(
  businessId: string,
): Promise<TelegramConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("telegram_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return data ? mapTelegramConnection(data) : null;
}

export function getTelegramConnectConfig(): TelegramConnectConfig {
  const webhookBaseUrl = getTelegramWebhookUrl();

  return {
    isConfigured: webhookBaseUrl.startsWith("https://"),
    webhookBaseUrl,
  };
}

export async function connectTelegramBot(
  input: TelegramConnectInput,
): Promise<ConnectTelegramBotResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const webhookUrl = getTelegramWebhookUrl();

  if (!webhookUrl.startsWith("https://")) {
    return missingConfigError();
  }

  const parsed = telegramConnectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? TELEGRAM_MESSAGES.genericError,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: TELEGRAM_MESSAGES.noBusinessDescription,
      },
    };
  }

  const botInfoResult = await getTelegramBotInfo(parsed.data.botToken);

  if (!botInfoResult.success) {
    return {
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: TELEGRAM_MESSAGES.invalidToken,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingConnection } = await supabase
    .from("telegram_connections")
    .select("id, telegram_status")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existingConnection?.telegram_status === "connected") {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: TELEGRAM_MESSAGES.alreadyConnected,
      },
    };
  }

  const webhookSecret = randomBytes(24).toString("hex");
  const connectedAt = new Date().toISOString();
  const connectionPayload = {
    business_id: businessId,
    bot_username: botInfoResult.bot.username,
    telegram_status: "connected" as const,
    telegram_bot_id: String(botInfoResult.bot.id),
    bot_token: parsed.data.botToken,
    webhook_secret: webhookSecret,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: savedConnection, error: saveError } = existingConnection
    ? await supabase
        .from("telegram_connections")
        .update(connectionPayload)
        .eq("id", existingConnection.id)
        .select("*")
        .single()
    : await supabase
        .from("telegram_connections")
        .insert(connectionPayload)
        .select("*")
        .single();

  if (saveError || !savedConnection) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: TELEGRAM_MESSAGES.genericError,
      },
    };
  }

  const webhookResult = await setTelegramWebhook(
    parsed.data.botToken,
    webhookUrl,
    webhookSecret,
  );

  if (!webhookResult.success) {
    await supabase
      .from("telegram_connections")
      .update({ telegram_status: "disconnected" })
      .eq("id", savedConnection.id);

    return {
      success: false,
      error: {
        code: "WEBHOOK_FAILED",
        message: webhookResult.message,
      },
    };
  }

  revalidateTelegramPaths();

  return {
    success: true,
    data: {
      connection: mapTelegramConnection(savedConnection),
    },
  };
}

async function ingestTelegramMessage(
  admin: ReturnType<typeof createAdminClient>,
  connection: TelegramConnection,
  message: TelegramInboundMessage,
): Promise<void> {
  const businessId = connection.business_id;
  const identifier = `tg:${message.chatId}`;

  const context = await resolveInboundMessageContext(admin, {
    businessId,
    channel: "telegram",
    contactName: message.contactName,
    contactPhone: identifier,
    identifier,
    displayLabel: message.contactName,
  });

  if (!context) {
    return;
  }

  const { contactId, conversationId, createdContact } = context;

  if (connection.bot_token) {
    void scheduleContactAvatarSync({
      admin,
      businessId,
      contactId,
      channel: "telegram",
      telegram: {
        botToken: connection.bot_token,
        userId: message.telegramUserId,
      },
    });
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

  const insertResult = await insertInboundChannelMessage(admin, {
    conversationId,
    channel: "telegram",
    content,
    externalMessageId: message.externalMessageId,
  });

  if (!insertResult || insertResult.isDuplicate) {
    return;
  }

  const insertedMessage = insertResult.message;

  if (message.kind === "media") {
    await createPendingMessageAttachment(admin, {
      messageId: insertedMessage.id,
      businessId,
      content,
      providerMediaId: message.fileId,
    });
  }

  if (message.kind === "media" && connection.bot_token) {
    scheduleInboundMediaHydration({
      admin,
      messageId: insertedMessage.id,
      businessId,
      conversationId,
      channel: "telegram",
      kind: message.mediaKind,
      fileName: message.fileName,
      mimeType: message.mimeType,
      caption: message.caption,
      providerMediaId: message.fileId,
    });
  }

  void completeInboundTelegramMessage({
    admin,
    businessId,
    connection,
    conversationId,
    contactId,
    createdContact,
    content,
    message,
  }).catch((error) => {
    console.error("[telegram] post-insert failed", error);
  });
}

async function completeInboundTelegramMessage(input: {
  admin: ReturnType<typeof createAdminClient>;
  businessId: string;
  connection: TelegramConnection;
  conversationId: string;
  contactId: string;
  createdContact: boolean;
  content: string;
  message: TelegramInboundMessage;
}): Promise<void> {
  const {
    admin,
    businessId,
    connection,
    conversationId,
    contactId,
    createdContact,
    content,
    message,
  } = input;

  await incrementMessagingAnalytics(admin, businessId, "telegram", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  if (createdContact) {
    scheduleNewLeadPush({
      businessId,
      contactId,
      contactName: message.contactName,
      channel: "telegram",
      preview: getMessagePlainText(content),
    });
  }

  await admin
    .from("telegram_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  scheduleChannelAutoReply({
    admin,
    businessId,
    channel: "telegram",
    conversationId,
    clientMessage: getMessagePlainText(content),
    sendReply: async (text) => {
      if (!connection.bot_token) {
        return { success: false };
      }

      const sendResult = await sendTelegramTextMessage(
        connection.bot_token,
        message.chatId,
        text,
      );

      return { success: sendResult.success };
    },
  });
}

export async function processTelegramWebhook(
  secretToken: string,
  payload: TelegramWebhookPayload,
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv() || !secretToken) {
    return { processed: 0 };
  }

  const messages = parseTelegramWebhookPayload(payload);

  if (messages.length === 0) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("telegram_connections")
    .select("*")
    .eq("webhook_secret", secretToken)
    .eq("telegram_status", "connected")
    .maybeSingle();

  if (!connection?.bot_token) {
    return { processed: 0 };
  }

  let processed = 0;

  for (const message of messages) {
    await ingestTelegramMessage(admin, connection, message);
    processed += 1;
  }

  return { processed };
}

export async function sendTelegramChatMessage(
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
    .eq("channel", "telegram")
    .maybeSingle();

  if (!conversation) {
    return { success: false, message: "Conversation not found." };
  }

  const contactRow = Array.isArray(conversation.contact)
    ? conversation.contact[0]
    : conversation.contact;

  const chatId = contactRow?.phone_number?.replace(/^tg:/, "");

  if (!chatId) {
    return { success: false, message: "Invalid Telegram recipient." };
  }

  const { data: connection } = await admin
    .from("telegram_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("telegram_status", "connected")
    .maybeSingle();

  if (!connection?.bot_token) {
    return { success: false, message: TELEGRAM_MESSAGES.notConfigured };
  }

  const insertedMessage = await insertChannelMessage(admin, {
    conversationId,
    channel: "telegram",
    senderType: "user",
    content,
  });

  await createOutboundMessageDelivery(admin, {
    messageId: insertedMessage.id,
    businessId,
    channel: "telegram",
  });

  scheduleOutboundMessageDelivery(insertedMessage.id);

  return { success: true, message: insertedMessage };
}
