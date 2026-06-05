import "server-only";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { ENV_KEYS } from "@/constants/env-keys";
import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { TELEGRAM_MESSAGES } from "@/features/telegram/constants";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getTelegramBotInfo,
  sendTelegramTextMessage,
  setTelegramWebhook,
} from "@/lib/telegram/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { enableAiForChannelOnConnect } from "@/services/channel-workspace.service";
import {
  incrementMessagingAnalytics,
  insertChannelMessage,
  processChannelAutoReply,
} from "@/services/messaging.service";
import type { TelegramConnection } from "@/types/database.types";
import type {
  ConnectTelegramBotResult,
  TelegramConnectConfig,
  TelegramConnectInput,
  TelegramConnectionData,
  TelegramWebhookPayload,
} from "@/types/telegram.types";
import { telegramConnectSchema } from "@/types/telegram.types";
import { mapTelegramConnection } from "@/utils/telegram";
import { parseTelegramWebhookPayload } from "@/utils/telegram-webhook";

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
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

function getTelegramWebhookUrl(): string {
  const appUrl = process.env[ENV_KEYS.NEXT_PUBLIC_APP_URL]?.trim() ?? "";
  return appUrl ? `${appUrl}/api/webhooks/telegram` : "";
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

  await enableAiForChannelOnConnect(businessId, "telegram");

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
  message: {
    chatId: string;
    body: string;
    contactName: string;
  },
): Promise<void> {
  const businessId = connection.business_id;
  const identifier = `tg:${message.chatId}`;

  const { data: existingContact } = await admin
    .from("contacts")
    .select("id")
    .eq("business_id", businessId)
    .eq("channel", "telegram")
    .eq("phone_number", identifier)
    .maybeSingle();

  let contactId = existingContact?.id;
  let createdContact = false;

  if (!contactId) {
    const { data: createdContactRow } = await admin
      .from("contacts")
      .insert({
        business_id: businessId,
        channel: "telegram",
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

  const { data: existingConversation } = await admin
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("channel", "telegram")
    .eq("status", "active")
    .maybeSingle();

  let conversationId = existingConversation?.id;

  if (!conversationId) {
    const { data: createdConversation } = await admin
      .from("conversations")
      .insert({
        business_id: businessId,
        channel: "telegram",
        contact_id: contactId,
        status: "active",
      })
      .select("id")
      .single();

    conversationId = createdConversation?.id;
  }

  if (!conversationId) {
    return;
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel: "telegram",
    senderType: "client",
    content: message.body,
  });

  await incrementMessagingAnalytics(admin, businessId, "telegram", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  await admin
    .from("telegram_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  await processChannelAutoReply({
    admin,
    businessId,
    channel: "telegram",
    conversationId,
    clientMessage: message.body,
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

  if (processed > 0) {
    revalidateTelegramPaths();
  }

  return { processed };
}

export async function sendTelegramChatMessage(
  businessId: string,
  conversationId: string,
  content: string,
): Promise<{ success: true } | { success: false; message: string }> {
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

  const sendResult = await sendTelegramTextMessage(
    connection.bot_token,
    chatId,
    content,
  );

  if (!sendResult.success) {
    return { success: false, message: sendResult.message };
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel: "telegram",
    senderType: "user",
    content,
  });

  await incrementMessagingAnalytics(admin, businessId, "telegram", {
    totalMessages: 1,
  });

  return { success: true };
}
