import "server-only";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { buildAppUrl } from "@/lib/app-url";
import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { TELEGRAM_MESSAGES } from "@/features/telegram/constants";
import { hasSupabaseEnv } from "@/lib/env";
import {
  deleteTelegramWebhook,
  getTelegramBotInfo,
  setTelegramWebhook,
} from "@/lib/telegram/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enableChannelAiIfAgentActive } from "@/services/channel-workspace.service";
import { scheduleOutboundMessageDelivery } from "@/services/message-delivery.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { assertCanConnectIntegration } from "@/services/entitlement.service";
import { scheduleContactAvatarSync } from "@/services/contact-avatar-sync.service";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import { createPendingMessageAttachment } from "@/services/message-attachment.service";
import { scheduleInboundMessagePush } from "@/services/push-notifications.service";
import {
  createOutboundMessageDelivery,
  incrementMessagingAnalytics,
  insertChannelMessage,
  scheduleInboundMessageProcessing,
} from "@/services/messaging.service";
import {
  deleteIntegrationSecret,
  resolveIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
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
  shouldDeferAutoReplyForInboundVoice,
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

function hashTelegramWebhookSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
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

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("telegram_connections")
    .select(
      "id, business_id, bot_token, bot_token_secret_key_name, webhook_secret_secret_key_name",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const botToken = connection
    ? await resolveIntegrationSecret(admin, {
        businessId,
        kind: "TELEGRAM_BOT_TOKEN",
        secretKeyName: connection.bot_token_secret_key_name,
        legacyValue: connection.bot_token,
        onMigrated: async (secretKeyName) => {
          await admin
            .from("telegram_connections")
            .update({
              bot_token: null,
              bot_token_secret_key_name: secretKeyName,
            })
            .eq("id", connection.id);
        },
      })
    : null;

  if (botToken) {
    await deleteTelegramWebhook(botToken);
  }

  const { error } = await admin
    .from("telegram_connections")
    .update({
      telegram_status: "disconnected",
      bot_username: "",
      telegram_bot_id: null,
      bot_token: null,
      bot_token_secret_key_name: null,
      webhook_secret: null,
      webhook_secret_secret_key_name: null,
      webhook_secret_hash: null,
      connected_at: null,
      last_synced_at: null,
    })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  await Promise.all([
    deleteIntegrationSecret(admin, connection?.bot_token_secret_key_name),
    deleteIntegrationSecret(admin, connection?.webhook_secret_secret_key_name),
  ]);

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
    .order("created_at", { ascending: false })
    .limit(1)
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

  const channelEntitlement = await assertCanConnectIntegration(businessId, "telegram");
  if (!channelEntitlement.allowed) {
    return {
      success: false,
      error: {
        code: "PLAN_LIMIT",
        message: channelEntitlement.message,
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

  const admin = createAdminClient();
  const { data: existingConnection } = await admin
    .from("telegram_connections")
    .select("id, telegram_status")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
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
  const [botTokenSecretKeyName, webhookSecretKeyName] = await Promise.all([
    storeIntegrationSecret(admin, {
      businessId,
      kind: "TELEGRAM_BOT_TOKEN",
      value: parsed.data.botToken,
    }),
    storeIntegrationSecret(admin, {
      businessId,
      kind: "TELEGRAM_WEBHOOK_SECRET",
      value: webhookSecret,
    }),
  ]);
  const connectionPayload = {
    business_id: businessId,
    bot_username: botInfoResult.bot.username,
    telegram_status: "connected" as const,
    telegram_bot_id: String(botInfoResult.bot.id),
    bot_token: null,
    bot_token_secret_key_name: botTokenSecretKeyName,
    webhook_secret: null,
    webhook_secret_secret_key_name: webhookSecretKeyName,
    webhook_secret_hash: hashTelegramWebhookSecret(webhookSecret),
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: savedConnection, error: saveError } = existingConnection
    ? await admin
        .from("telegram_connections")
        .update(connectionPayload)
        .eq("id", existingConnection.id)
        .select("*")
        .single()
    : await admin
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
    await admin
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

  await enableChannelAiIfAgentActive(businessId, "telegram", admin);

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
    sentAt: message.sentAt,
  });

  if (!insertResult || insertResult.isDuplicate) {
    return;
  }

  const insertedMessage = insertResult.message;

  scheduleInboundMessagePush({
    businessId,
    contactId,
    contactName: message.contactName,
    conversationId,
    channel: "telegram",
    preview: getMessagePlainText(content),
    isNewContact: createdContact,
  });

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

  await completeInboundTelegramMessage({
    admin,
    businessId,
    connection,
    conversationId,
    contactId,
    createdContact,
    content,
    message,
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
    createdContact,
    content,
  } = input;

  await incrementMessagingAnalytics(admin, businessId, "telegram", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  await admin
    .from("telegram_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  if (!shouldDeferAutoReplyForInboundVoice(content)) {
    await scheduleInboundMessageProcessing({
      admin,
      businessId,
      channel: "telegram",
      conversationId,
      clientMessage: getMessagePlainText(content),
    });
  }
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
  const secretHash = hashTelegramWebhookSecret(secretToken);
  let connectionQuery = await admin
    .from("telegram_connections")
    .select("*")
    .eq("webhook_secret_hash", secretHash)
    .eq("telegram_status", "connected")
    .maybeSingle();

  if (!connectionQuery.data) {
    connectionQuery = await admin
      .from("telegram_connections")
      .select("*")
      .eq("webhook_secret", secretToken)
      .eq("telegram_status", "connected")
      .maybeSingle();
  }

  const connection = connectionQuery.data;

  if (!connection) {
    return { processed: 0 };
  }

  const [botToken, webhookSecretKeyName] = await Promise.all([
    resolveIntegrationSecret(admin, {
      businessId: connection.business_id,
      kind: "TELEGRAM_BOT_TOKEN",
      secretKeyName: connection.bot_token_secret_key_name,
      legacyValue: connection.bot_token,
      onMigrated: async (secretKeyName) => {
        await admin
          .from("telegram_connections")
          .update({
            bot_token: null,
            bot_token_secret_key_name: secretKeyName,
          })
          .eq("id", connection.id);
      },
    }),
    storeIntegrationSecret(admin, {
      businessId: connection.business_id,
      kind: "TELEGRAM_WEBHOOK_SECRET",
      value: secretToken,
    }),
  ]);

  if (!botToken) {
    return { processed: 0 };
  }

  if (!connection.webhook_secret_hash || connection.webhook_secret) {
    await admin
      .from("telegram_connections")
      .update({
        webhook_secret: null,
        webhook_secret_secret_key_name: webhookSecretKeyName,
        webhook_secret_hash: secretHash,
      })
      .eq("id", connection.id);
  }

  const hydratedConnection = { ...connection, bot_token: botToken };
  let processed = 0;

  for (const message of messages) {
    await ingestTelegramMessage(admin, hydratedConnection, message);
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
    .select("id, business_id, bot_token, bot_token_secret_key_name")
    .eq("business_id", businessId)
    .eq("telegram_status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const botToken = connection
    ? await resolveIntegrationSecret(admin, {
        businessId,
        kind: "TELEGRAM_BOT_TOKEN",
        secretKeyName: connection.bot_token_secret_key_name,
        legacyValue: connection.bot_token,
        onMigrated: async (secretKeyName) => {
          await admin
            .from("telegram_connections")
            .update({
              bot_token: null,
              bot_token_secret_key_name: secretKeyName,
            })
            .eq("id", connection.id);
        },
      })
    : null;

  if (!botToken) {
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
