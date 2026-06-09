import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { ENV_KEYS } from "@/constants/env-keys";
import {
  getMetaAppId,
  getWhatsAppEmbeddedSignupConfigId,
  hasEmbeddedSignupEnv,
  hasSupabaseEnv,
} from "@/lib/env";
import {
  exchangeEmbeddedSignupCode,
  getWhatsAppApiVersion,
  sendWhatsAppTextMessage,
  subscribeAppToWaba,
  verifyWhatsAppCredentials,
} from "@/lib/whatsapp/client";
import { isEmbeddedSignupFinishEvent } from "@/lib/whatsapp/embedded-signup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { enableAiForChannelOnConnect } from "@/services/channel-workspace.service";
import {
  findContactForChannel,
  incrementMessagingAnalytics,
  insertChannelMessage,
  processChannelAutoReply,
  resolveInboundConversation,
} from "@/services/messaging.service";
import type { WhatsappConnection } from "@/types/database.types";
import type {
  CompleteEmbeddedSignupInput,
  CompleteEmbeddedSignupResult,
  ConnectManualWhatsAppInput,
  ConnectManualWhatsAppResult,
  SyncWhatsAppResult,
  WhatsAppConnectConfig,
  WhatsAppConnectionData,
  WhatsAppEmbeddedSignupConfig,
  WhatsAppWebhookPayload,
} from "@/types/whatsapp.types";
import {
  completeEmbeddedSignupSchema,
  connectManualWhatsAppSchema,
} from "@/types/whatsapp.types";
import {
  downloadAndStoreWhatsAppInboundMedia,
} from "@/services/inbound-media.service";
import {
  buildInboundMediaFallbackContent,
  getMessagePlainText,
} from "@/utils/chat-media";
import {
  mapWhatsAppConnection,
  normalizePhoneNumber,
  parseWhatsAppWebhookPayload,
} from "@/utils/whatsapp";
import type { WhatsAppWebhookMessage } from "@/types/whatsapp.types";

function missingConfigError(): {
  success: false;
  error: { code: "MISSING_CONFIG"; message: string };
} {
  return {
    success: false,
    error: {
      code: "MISSING_CONFIG",
      message: WHATSAPP_MESSAGES.genericError,
    },
  };
}

function revalidateWhatsAppPaths(): void {
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(DASHBOARD_ROUTES.integrations);
  revalidatePath(`${DASHBOARD_ROUTES.integrations}/whatsapp`);
  revalidatePath(DASHBOARD_ROUTES.marketplace);
  revalidatePath(DASHBOARD_ROUTES.chats);
}

async function getOwnedBusinessId(): Promise<string | null> {
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);
  return business?.id ?? null;
}

export async function getWhatsAppConnection(
  businessId: string,
): Promise<WhatsAppConnectionData | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapWhatsAppConnection(data) : null;
}

export function getWhatsAppWebhookUrl(): string {
  const appUrl = process.env[ENV_KEYS.NEXT_PUBLIC_APP_URL]?.trim() ?? "";

  if (!appUrl) {
    return "";
  }

  return `${appUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`;
}

export function getWhatsAppConnectConfig(): WhatsAppConnectConfig {
  const webhookUrl = getWhatsAppWebhookUrl();

  return {
    isConfigured: hasSupabaseEnv() && webhookUrl.startsWith("https://"),
    webhookUrl,
  };
}

export async function disconnectWhatsApp(): Promise<{
  success: boolean;
  message?: string;
}> {
  if (!hasSupabaseEnv()) {
    return { success: false, message: WHATSAPP_MESSAGES.genericError };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return { success: false, message: WHATSAPP_MESSAGES.noBusinessDescription };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_connections")
    .update({
      whatsapp_status: "disconnected",
      phone_number: "",
      meta_phone_number_id: null,
      meta_access_token: null,
      meta_waba_id: null,
      meta_business_account_id: null,
      connected_at: null,
      last_synced_at: null,
    })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateWhatsAppPaths();
  return { success: true };
}

export async function getWhatsAppEmbeddedSignupConfig(): Promise<WhatsAppEmbeddedSignupConfig> {
  const appId = getMetaAppId();
  const configId = getWhatsAppEmbeddedSignupConfigId();

  return {
    appId: appId ?? "",
    configId: configId ?? "",
    graphApiVersion: getWhatsAppApiVersion(),
    isConfigured: hasEmbeddedSignupEnv(),
  };
}

export async function completeEmbeddedSignup(
  input: CompleteEmbeddedSignupInput,
): Promise<CompleteEmbeddedSignupResult> {
  if (!hasSupabaseEnv() || !hasEmbeddedSignupEnv()) {
    return missingConfigError();
  }

  const parsed = completeEmbeddedSignupSchema.safeParse(input);

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
    if (parsed.data.finishEvent === "FINISH_ONLY_WABA") {
      return {
        success: false,
        error: {
          code: "SIGNUP_INCOMPLETE",
          message: WHATSAPP_MESSAGES.whatsappBusinessRequired,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "SIGNUP_INCOMPLETE",
        message: WHATSAPP_MESSAGES.signupIncomplete,
      },
    };
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: WHATSAPP_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingConnection } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  if (existingConnection) {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: WHATSAPP_MESSAGES.alreadyConnected,
      },
    };
  }

  const tokenResult = await exchangeEmbeddedSignupCode(parsed.data.code);

  if (!tokenResult.success) {
    return {
      success: false,
      error: {
        code: "TOKEN_EXCHANGE_FAILED",
        message: tokenResult.message,
      },
    };
  }

  const subscribeResult = await subscribeAppToWaba(
    parsed.data.wabaId,
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

  const credentialCheck = await verifyWhatsAppCredentials(
    parsed.data.phoneNumberId,
    tokenResult.accessToken,
  );

  if (!credentialCheck.success) {
    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: credentialCheck.message || WHATSAPP_MESSAGES.invalidCredentials,
      },
    };
  }

  const connectedAt = new Date().toISOString();
  const phoneNumber =
    credentialCheck.displayPhoneNumber ??
    normalizePhoneNumber(parsed.data.phoneNumberId);

  const connectionPayload = {
    business_id: businessId,
    phone_number: phoneNumber,
    whatsapp_status: "connected" as const,
    meta_phone_number_id: parsed.data.phoneNumberId,
    meta_access_token: tokenResult.accessToken,
    meta_waba_id: parsed.data.wabaId,
    meta_business_account_id: parsed.data.businessAccountId ?? null,
    verification_code_hash: null,
    verification_expires_at: null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: existingPending } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .neq("whatsapp_status", "connected")
    .maybeSingle();

  const { data, error } = existingPending
    ? await supabase
        .from("whatsapp_connections")
        .update(connectionPayload)
        .eq("id", existingPending.id)
        .select("*")
        .single()
    : await supabase
        .from("whatsapp_connections")
        .insert(connectionPayload)
        .select("*")
        .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: error?.message || WHATSAPP_MESSAGES.genericError,
      },
    };
  }

  await enableAiForChannelOnConnect(businessId, "whatsapp");

  revalidateWhatsAppPaths();

  return {
    success: true,
    data: {
      connection: mapWhatsAppConnection(data),
    },
  };
}

export async function connectManualWhatsApp(
  input: ConnectManualWhatsAppInput,
): Promise<ConnectManualWhatsAppResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const parsed = connectManualWhatsAppSchema.safeParse(input);

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
        message: WHATSAPP_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: existingConnection } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  if (existingConnection) {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: WHATSAPP_MESSAGES.alreadyConnected,
      },
    };
  }

  const accessToken = parsed.data.accessToken;

  const credentialCheck = await verifyWhatsAppCredentials(
    parsed.data.phoneNumberId,
    accessToken,
  );

  if (!credentialCheck.success) {
    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: credentialCheck.message || WHATSAPP_MESSAGES.invalidCredentials,
      },
    };
  }

  const subscribeResult = await subscribeAppToWaba(
    parsed.data.wabaId,
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
  const phoneNumber =
    credentialCheck.displayPhoneNumber ??
    normalizePhoneNumber(parsed.data.phoneNumberId);

  const connectionPayload = {
    business_id: businessId,
    phone_number: phoneNumber,
    whatsapp_status: "connected" as const,
    meta_phone_number_id: parsed.data.phoneNumberId,
    meta_access_token: accessToken,
    meta_waba_id: parsed.data.wabaId,
    meta_business_account_id: parsed.data.businessAccountId ?? null,
    verification_code_hash: null,
    verification_expires_at: null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: existingPending } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .neq("whatsapp_status", "connected")
    .maybeSingle();

  const { data, error } = existingPending
    ? await supabase
        .from("whatsapp_connections")
        .update(connectionPayload)
        .eq("id", existingPending.id)
        .select("*")
        .single()
    : await supabase
        .from("whatsapp_connections")
        .insert(connectionPayload)
        .select("*")
        .single();

  if (error || !data) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: error?.message || WHATSAPP_MESSAGES.genericError,
      },
    };
  }

  await enableAiForChannelOnConnect(businessId, "whatsapp");

  revalidateWhatsAppPaths();

  return {
    success: true,
    data: {
      connection: mapWhatsAppConnection(data),
    },
  };
}

export async function syncWhatsAppMessages(): Promise<SyncWhatsAppResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  const businessId = await getOwnedBusinessId();

  if (!businessId) {
    return {
      success: false,
      error: {
        code: "NO_BUSINESS",
        message: WHATSAPP_MESSAGES.noBusinessDescription,
      },
    };
  }

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  if (!connection?.meta_phone_number_id || !connection.meta_access_token) {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: WHATSAPP_MESSAGES.genericError,
      },
    };
  }

  const credentialCheck = await verifyWhatsAppCredentials(
    connection.meta_phone_number_id,
    connection.meta_access_token,
  );

  if (!credentialCheck.success) {
    await supabase
      .from("whatsapp_connections")
      .update({ whatsapp_status: "disconnected" })
      .eq("id", connection.id);

    return {
      success: false,
      error: {
        code: "SYNC_FAILED",
        message: credentialCheck.message,
      },
    };
  }

  const syncedAt = new Date().toISOString();
  await supabase
    .from("whatsapp_connections")
    .update({ last_synced_at: syncedAt })
    .eq("id", connection.id);

  revalidateWhatsAppPaths();

  return {
    success: true,
    data: { syncedAt },
  };
}

async function ingestIncomingMessage(
  admin: ReturnType<typeof createAdminClient>,
  connection: WhatsappConnection,
  message: WhatsAppWebhookMessage,
): Promise<void> {
  const businessId = connection.business_id;
  const normalizedPhone = normalizePhoneNumber(message.from);

  const existingContact = await findContactForChannel(
    admin,
    businessId,
    "whatsapp",
    normalizedPhone,
  );

  let contactId = existingContact?.id;
  let createdContact = false;

  if (!contactId) {
    const { data: createdContactRow } = await admin
      .from("contacts")
      .insert({
        business_id: businessId,
        channel: "whatsapp",
        name: message.contactName,
        phone_number: normalizedPhone,
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
        phone_number: normalizedPhone,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", contactId);
  }

  if (!contactId) {
    return;
  }

  const conversationId = await resolveInboundConversation(
    admin,
    businessId,
    contactId,
    "whatsapp",
  );

  if (!conversationId) {
    return;
  }

  let content =
    message.kind === "text"
      ? message.body
      : null;

  if (message.kind === "media") {
    if (connection.meta_access_token) {
      content = await downloadAndStoreWhatsAppInboundMedia({
        accessToken: connection.meta_access_token,
        mediaId: message.mediaId,
        businessId,
        conversationId,
        kind: message.mediaKind,
        fileName: message.fileName,
        mimeType: message.mimeType,
        caption: message.caption,
      });
    }

    if (!content) {
      content = buildInboundMediaFallbackContent(
        message.mediaKind,
        message.caption,
        message.fileName,
      );
    }
  }

  if (!content) {
    return;
  }

  await insertChannelMessage(admin, {
    conversationId,
    channel: "whatsapp",
    senderType: "client",
    content,
  });

  await incrementMessagingAnalytics(admin, businessId, "whatsapp", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  await admin
    .from("whatsapp_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  await processChannelAutoReply({
    admin,
    businessId,
    channel: "whatsapp",
    conversationId,
    clientMessage: getMessagePlainText(content),
    sendReply: async (text) => {
      if (!connection.meta_phone_number_id || !connection.meta_access_token) {
        return { success: false };
      }

      const sendResult = await sendWhatsAppTextMessage(
        connection.meta_phone_number_id,
        connection.meta_access_token,
        normalizedPhone.replace(/^\+/, ""),
        text,
      );

      return { success: sendResult.success };
    },
  });
}

export async function processWhatsAppWebhook(
  payload: WhatsAppWebhookPayload,
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv()) {
    return { processed: 0 };
  }

  const messages = parseWhatsAppWebhookPayload(payload);

  if (messages.length === 0) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  let processed = 0;

  for (const message of messages) {
    const { data: connection } = await admin
      .from("whatsapp_connections")
      .select("*")
      .eq("meta_phone_number_id", message.phoneNumberId)
      .eq("whatsapp_status", "connected")
      .maybeSingle();

    if (!connection) {
      continue;
    }

    await ingestIncomingMessage(admin, connection, message);

    processed += 1;
  }

  if (processed > 0) {
    revalidateWhatsAppPaths();
    revalidatePath(APP_ROUTES.dashboard);
  }

  return { processed };
}
