import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
import { WHATSAPP_MESSAGES } from "@/features/whatsapp/constants";
import { buildAppUrl } from "@/lib/app-url";
import {
  generateDialog360ChannelApiKey,
  getDialog360ChannelDetails,
  getDialog360PartnerId,
  hasDialog360EmbeddedSignupEnv,
  isDialog360ChannelReadyEvent,
  type Dialog360PartnerWebhookPayload,
} from "@/lib/dialog360/partner";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getDialog360ApiBase,
  getDialog360ApiMode,
  isDialog360SandboxMode,
} from "@/lib/whatsapp/constants";
import {
  set360DialogWebhook,
  verifyWhatsAppCredentials,
} from "@/lib/whatsapp/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getWorkerConcurrency,
  runWithConcurrency,
} from "@/lib/queue/worker-concurrency";
import { createClient } from "@/lib/supabase/server";
import { enableChannelAiIfAgentActive } from "@/services/channel-workspace.service";
import { requireUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { applyWhatsAppDeliveryStatusUpdates } from "@/services/message-delivery-status.service";
import { scheduleInboundMessagePush } from "@/services/push-notifications.service";
import {
  insertInboundChannelMessage,
  resolveInboundMessageContext,
} from "@/services/inbound-ingest.service";
import { createPendingMessageAttachment } from "@/services/message-attachment.service";
import {
  incrementMessagingAnalytics,
  scheduleInboundMessageProcessing,
} from "@/services/messaging.service";
import {
  deleteIntegrationSecret,
  resolveIntegrationSecret,
  storeIntegrationSecret,
} from "@/services/integration-secrets.service";
import type { WhatsappConnection, TablesInsert } from "@/types/database.types";
import type {
  Complete360DialogEmbeddedSignupInput,
  Complete360DialogEmbeddedSignupResult,
  ConnectManualWhatsAppInput,
  ConnectManualWhatsAppResult,
  SyncWhatsAppResult,
  WhatsAppConnectConfig,
  WhatsAppConnectionData,
  WhatsAppWebhookPayload,
} from "@/types/whatsapp.types";
import {
  complete360DialogEmbeddedSignupSchema,
  connectManualWhatsAppSchema,
} from "@/types/whatsapp.types";
import { scheduleInboundMediaHydration } from "@/services/inbound-media-hydration.service";
import {
  buildInboundMediaFallbackContent,
  getMessagePlainText,
  shouldDeferAutoReplyForInboundVoice,
} from "@/utils/chat-media";
import { parseUnixSecondsToIso } from "@/utils/message-timestamp";
import {
  mapWhatsAppConnection,
  normalizePhoneNumber,
  parseWhatsAppWebhookPayload,
  parseWhatsAppWebhookStatusUpdates,
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
  return buildAppUrl("/api/webhooks/whatsapp");
}

export function getDialog360PartnerWebhookUrl(): string {
  return buildAppUrl("/api/webhooks/360dialog-partner");
}

export function getWhatsAppConnectConfig(): WhatsAppConnectConfig {
  const webhookUrl = getWhatsAppWebhookUrl();
  const integrationsRedirectUrl = buildAppUrl(
    `${DASHBOARD_ROUTES.integrations}/whatsapp`,
  );

  return {
    isConfigured: hasSupabaseEnv() && webhookUrl.startsWith("https://"),
    webhookUrl,
    embeddedSignupEnabled:
      hasDialog360EmbeddedSignupEnv() && !isDialog360SandboxMode(),
    partnerId: getDialog360PartnerId(),
    integrationsRedirectUrl,
    apiMode: getDialog360ApiMode(),
    apiBaseUrl: getDialog360ApiBase(),
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

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("whatsapp_connections")
    .select("meta_access_token_secret_key_name")
    .eq("business_id", businessId)
    .maybeSingle();

  const { error } = await admin
    .from("whatsapp_connections")
    .update({
      whatsapp_status: "disconnected",
      phone_number: "",
      meta_phone_number_id: null,
      meta_access_token: null,
      meta_access_token_secret_key_name: null,
      meta_waba_id: null,
      meta_business_account_id: null,
      dialog360_channel_id: null,
      dialog360_client_id: null,
      connected_at: null,
      last_synced_at: null,
    })
    .eq("business_id", businessId);

  if (error) {
    return { success: false, message: error.message };
  }

  await deleteIntegrationSecret(admin, existing?.meta_access_token_secret_key_name);

  revalidateWhatsAppPaths();
  return { success: true };
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

  const admin = createAdminClient();
  const { data: existingConnection } = await admin
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

  const apiKey = parsed.data.apiKey;
  const webhookUrl = getWhatsAppWebhookUrl();

  const credentialCheck = await verifyWhatsAppCredentials(
    parsed.data.phoneNumberId,
    apiKey,
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

  if (!webhookUrl.startsWith("https://")) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: WHATSAPP_MESSAGES.notConfigured,
      },
    };
  }

  const webhookResult = await set360DialogWebhook(apiKey, webhookUrl);

  if (!webhookResult.success) {
    return {
      success: false,
      error: {
        code: "WEBHOOK_SETUP_FAILED",
        message: webhookResult.message || WHATSAPP_MESSAGES.webhookSetupFailed,
      },
    };
  }

  const connectedAt = new Date().toISOString();
  const phoneNumber = parsed.data.displayPhoneNumber
    ? normalizePhoneNumber(parsed.data.displayPhoneNumber)
    : parsed.data.phoneNumberId;
  const secretKeyName = await storeIntegrationSecret(admin, {
    businessId,
    kind: "WHATSAPP_META_ACCESS_TOKEN",
    value: apiKey,
  });

  const connectionPayload = {
    business_id: businessId,
    phone_number: phoneNumber,
    whatsapp_status: "connected" as const,
    meta_phone_number_id: parsed.data.phoneNumberId,
    meta_access_token: null,
    meta_access_token_secret_key_name: secretKeyName,
    meta_waba_id: null,
    meta_business_account_id: null,
    dialog360_channel_id: null,
    dialog360_client_id: null,
    verification_code_hash: null,
    verification_expires_at: null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  };

  const { data: existingPending } = await admin
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .neq("whatsapp_status", "connected")
    .maybeSingle();

  const { data, error } = existingPending
    ? await admin
        .from("whatsapp_connections")
        .update(connectionPayload)
        .eq("id", existingPending.id)
        .select("*")
        .single()
    : await admin
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

  revalidateWhatsAppPaths();

  await enableChannelAiIfAgentActive(businessId, "whatsapp", admin);

  return {
    success: true,
    data: {
      connection: mapWhatsAppConnection(data),
    },
  };
}

type Activate360DialogChannelResult =
  | {
      success: true;
      activationStatus: "connected" | "pending";
      connection: WhatsappConnection;
    }
  | { success: false; message: string };

async function upsertWhatsAppConnection(
  supabase:
    | Awaited<ReturnType<typeof createClient>>
    | ReturnType<typeof createAdminClient>,
  businessId: string,
  payload: Omit<TablesInsert<"whatsapp_connections">, "business_id">,
): Promise<WhatsappConnection | null> {
  const { data: existing } = await supabase
    .from("whatsapp_connections")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data, error } = existing
    ? await supabase
        .from("whatsapp_connections")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single()
    : await supabase
        .from("whatsapp_connections")
        .insert({
          ...payload,
          business_id: businessId,
          phone_number: payload.phone_number ?? "",
        })
        .select("*")
        .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function activate360DialogChannel(input: {
  supabase:
    | Awaited<ReturnType<typeof createClient>>
    | ReturnType<typeof createAdminClient>;
  businessId: string;
  clientId: string;
  channelId: string;
  phoneHint?: string;
}): Promise<Activate360DialogChannelResult> {
  const { supabase, businessId, clientId, channelId, phoneHint } = input;
  const channelDetails = await getDialog360ChannelDetails(
    clientId,
    channelId,
    phoneHint,
  );

  if (!channelDetails) {
    const pendingConnection = await upsertWhatsAppConnection(supabase, businessId, {
      phone_number: phoneHint ? normalizePhoneNumber(phoneHint) : "Pending",
      whatsapp_status: "pending",
      dialog360_channel_id: channelId,
      dialog360_client_id: clientId,
      meta_phone_number_id: null,
      meta_access_token: null,
      connected_at: null,
      last_synced_at: null,
    });

    if (!pendingConnection) {
      return {
        success: false,
        message: WHATSAPP_MESSAGES.genericError,
      };
    }

    return {
      success: true,
      activationStatus: "pending",
      connection: pendingConnection,
    };
  }

  if (!channelDetails.metaPhoneNumberId) {
    const pendingConnection = await upsertWhatsAppConnection(supabase, businessId, {
      phone_number: normalizePhoneNumber(channelDetails.phoneNumber),
      whatsapp_status: "pending",
      dialog360_channel_id: channelId,
      dialog360_client_id: clientId,
      meta_phone_number_id: null,
      meta_access_token: null,
      connected_at: null,
      last_synced_at: null,
    });

    if (!pendingConnection) {
      return {
        success: false,
        message: WHATSAPP_MESSAGES.genericError,
      };
    }

    return {
      success: true,
      activationStatus: "pending",
      connection: pendingConnection,
    };
  }

  const apiKeyResult = await generateDialog360ChannelApiKey(channelId);

  if (!apiKeyResult.success) {
    return {
      success: false,
      message: apiKeyResult.message,
    };
  }

  const webhookUrl = getWhatsAppWebhookUrl();

  if (!webhookUrl.startsWith("https://")) {
    return {
      success: false,
      message: WHATSAPP_MESSAGES.notConfigured,
    };
  }

  const webhookResult = await set360DialogWebhook(apiKeyResult.apiKey, webhookUrl);

  if (!webhookResult.success) {
    return {
      success: false,
      message: webhookResult.message || WHATSAPP_MESSAGES.webhookSetupFailed,
    };
  }

  const credentialCheck = await verifyWhatsAppCredentials(
    channelDetails.metaPhoneNumberId,
    apiKeyResult.apiKey,
  );

  if (!credentialCheck.success) {
    return {
      success: false,
      message: credentialCheck.message || WHATSAPP_MESSAGES.invalidCredentials,
    };
  }

  const connectedAt = new Date().toISOString();
  const secretKeyName = await storeIntegrationSecret(createAdminClient(), {
    businessId,
    kind: "WHATSAPP_META_ACCESS_TOKEN",
    value: apiKeyResult.apiKey,
  });
  const connection = await upsertWhatsAppConnection(supabase, businessId, {
    phone_number: normalizePhoneNumber(channelDetails.phoneNumber),
    whatsapp_status: "connected",
    dialog360_channel_id: channelId,
    dialog360_client_id: clientId,
    meta_phone_number_id: channelDetails.metaPhoneNumberId,
    meta_access_token: null,
    meta_access_token_secret_key_name: secretKeyName,
    meta_waba_id: null,
    meta_business_account_id: null,
    verification_code_hash: null,
    verification_expires_at: null,
    connected_at: connectedAt,
    last_synced_at: connectedAt,
  });

  if (!connection) {
    return {
      success: false,
      message: WHATSAPP_MESSAGES.genericError,
    };
  }

  await enableChannelAiIfAgentActive(businessId, "whatsapp", supabase);

  return {
    success: true,
    activationStatus: "connected",
    connection,
  };
}

export async function complete360DialogEmbeddedSignup(
  input: Complete360DialogEmbeddedSignupInput,
): Promise<Complete360DialogEmbeddedSignupResult> {
  if (!hasSupabaseEnv()) {
    return missingConfigError();
  }

  if (!hasDialog360EmbeddedSignupEnv()) {
    return {
      success: false,
      error: {
        code: "PARTNER_NOT_CONFIGURED",
        message: WHATSAPP_MESSAGES.notConfigured,
      },
    };
  }

  const parsed = complete360DialogEmbeddedSignupSchema.safeParse(input);

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

  const admin = createAdminClient();
  const { data: existingConnection } = await admin
    .from("whatsapp_connections")
    .select("id, whatsapp_status")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existingConnection?.whatsapp_status === "connected") {
    return {
      success: false,
      error: {
        code: "ALREADY_CONNECTED",
        message: WHATSAPP_MESSAGES.alreadyConnected,
      },
    };
  }

  const channelId = parsed.data.channelIds[0];

  if (!channelId) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "No 360dialog channel ID was returned.",
      },
    };
  }

  const activation = await activate360DialogChannel({
    supabase: admin,
    businessId,
    clientId: parsed.data.clientId,
    channelId,
  });

  if (!activation.success) {
    return {
      success: false,
      error: {
        code: "CONNECT_FAILED",
        message: activation.message,
      },
    };
  }

  revalidateWhatsAppPaths();

  return {
    success: true,
    data: {
      connection: mapWhatsAppConnection(activation.connection),
      activationStatus: activation.activationStatus,
    },
  };
}

export async function processDialog360PartnerWebhook(
  payload: Dialog360PartnerWebhookPayload,
): Promise<{ processed: boolean }> {
  if (!hasSupabaseEnv() || !isDialog360ChannelReadyEvent(payload.event)) {
    return { processed: false };
  }

  const channelId = payload.data?.id?.trim();
  const clientId = payload.data?.client_id?.trim();

  if (!channelId || !clientId) {
    return { processed: false };
  }

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("whatsapp_connections")
    .select("*")
    .eq("dialog360_channel_id", channelId)
    .neq("whatsapp_status", "connected")
    .maybeSingle();

  if (!connection) {
    return { processed: false };
  }

  const activation = await activate360DialogChannel({
    supabase: admin,
    businessId: connection.business_id,
    clientId,
    channelId,
    phoneHint: payload.data?.setup_info?.phone_number,
  });

  if (!activation.success || activation.activationStatus !== "connected") {
    return { processed: false };
  }

  revalidateWhatsAppPaths();
  return { processed: true };
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

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("whatsapp_connections")
    .select(
      "id, business_id, whatsapp_status, meta_phone_number_id, meta_access_token, meta_access_token_secret_key_name",
    )
    .eq("business_id", businessId)
    .eq("whatsapp_status", "connected")
    .maybeSingle();

  const accessToken = connection
    ? await resolveIntegrationSecret(admin, {
        businessId,
        kind: "WHATSAPP_META_ACCESS_TOKEN",
        secretKeyName: connection.meta_access_token_secret_key_name,
        legacyValue: connection.meta_access_token,
        onMigrated: async (secretKeyName) => {
          await admin
            .from("whatsapp_connections")
            .update({
              meta_access_token: null,
              meta_access_token_secret_key_name: secretKeyName,
            })
            .eq("id", connection.id);
        },
      })
    : null;

  if (!connection?.meta_phone_number_id || !accessToken) {
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
    accessToken,
  );

  if (!credentialCheck.success) {
    await admin
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

  const context = await resolveInboundMessageContext(admin, {
    businessId,
    channel: "whatsapp",
    contactName: message.contactName,
    contactPhone: normalizedPhone,
    identifier: normalizedPhone,
    displayLabel: message.contactName,
  });

  if (!context) {
    return;
  }

  const { contactId, conversationId, createdContact } = context;

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
    channel: "whatsapp",
    content,
    externalMessageId: message.messageId,
    sentAt: parseUnixSecondsToIso(message.timestamp),
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
    channel: "whatsapp",
    preview: getMessagePlainText(content),
    isNewContact: createdContact,
  });

  if (message.kind === "media") {
    await createPendingMessageAttachment(admin, {
      messageId: insertedMessage.id,
      businessId,
      content,
      providerMediaId: message.mediaId,
    });
  }

  if (message.kind === "media") {
    scheduleInboundMediaHydration({
      admin,
      messageId: insertedMessage.id,
      businessId,
      conversationId,
      channel: "whatsapp",
      kind: message.mediaKind,
      fileName: message.fileName,
      mimeType: message.mimeType,
      caption: message.caption,
      providerMediaId: message.mediaId,
    });
  }

  await completeInboundWhatsAppMessage({
    admin,
    businessId,
    connection,
    conversationId,
    contactId,
    createdContact,
    content,
    message,
    normalizedPhone,
  });
}

async function completeInboundWhatsAppMessage(input: {
  admin: ReturnType<typeof createAdminClient>;
  businessId: string;
  connection: WhatsappConnection;
  conversationId: string;
  contactId: string;
  createdContact: boolean;
  content: string;
  message: WhatsAppWebhookMessage;
  normalizedPhone: string;
}): Promise<void> {
  const {
    admin,
    businessId,
    connection,
    conversationId,
    createdContact,
    content,
  } = input;

  await incrementMessagingAnalytics(admin, businessId, "whatsapp", {
    totalMessages: 1,
    totalContacts: createdContact ? 1 : 0,
  });

  await admin
    .from("whatsapp_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  if (!shouldDeferAutoReplyForInboundVoice(content)) {
    await scheduleInboundMessageProcessing({
      admin,
      businessId,
      channel: "whatsapp",
      conversationId,
      clientMessage: getMessagePlainText(content),
    });
  }
}

export async function processWhatsAppWebhook(
  payload: WhatsAppWebhookPayload,
): Promise<{ processed: number }> {
  if (!hasSupabaseEnv()) {
    return { processed: 0 };
  }

  const admin = createAdminClient();
  const statusUpdates = parseWhatsAppWebhookStatusUpdates(payload);
  let processed = await applyWhatsAppDeliveryStatusUpdates(admin, statusUpdates);

  const messages = parseWhatsAppWebhookPayload(payload);

  if (messages.length === 0) {
    return { processed };
  }

  const outcomes = await runWithConcurrency(
    messages,
    getWorkerConcurrency(),
    async (message) => {
      const { data: connection } = await admin
        .from("whatsapp_connections")
        .select("*")
        .eq("meta_phone_number_id", message.phoneNumberId)
        .eq("whatsapp_status", "connected")
        .maybeSingle();

      if (!connection) {
        return 0;
      }

      await ingestIncomingMessage(admin, connection, message);
      return 1;
    },
  );

  processed += outcomes.filter((count) => count === 1).length;

  return { processed };
}
